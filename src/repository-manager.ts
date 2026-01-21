/**
 * Repository Manager Service
 * Handles cloning repositories and capturing diffs
 */

import { execSync, exec } from "child_process";
import { mkdtemp, rm, readdir, writeFile, readFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join, basename } from "path";
import { existsSync } from "fs";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface CloneOptions {
  /** Repository URL (GitHub, GitLab, etc.) */
  repoUrl: string;
  /** Branch to clone (default: main/master) */
  branch?: string;
  /** Shallow clone depth (default: 1 for speed) */
  depth?: number;
  /** Keep the temp directory after tests (for debugging) */
  keepTempDir?: boolean;
}

export interface FileChange {
  /** File path relative to repo root */
  filePath: string;
  /** Type of change */
  changeType: "added" | "modified" | "deleted";
  /** Original content (for modified/deleted) */
  originalContent?: string;
  /** New content (for added/modified) */
  newContent?: string;
  /** Unified diff output */
  diff?: string;
  /** Number of lines added */
  linesAdded?: number;
  /** Number of lines removed */
  linesRemoved?: number;
}

export interface TestCodeChange {
  /** Test case ID */
  testCaseId: string;
  /** Model that generated the change */
  model: string;
  /** Files that were changed */
  changes: FileChange[];
  /** Command output if any */
  commandOutput?: string;
  /** Whether the change was successfully applied */
  applied: boolean;
  /** Error message if failed to apply */
  error?: string;
}

export class RepositoryManager {
  private tempDir: string | null = null;
  private repoPath: string | null = null;
  private options: CloneOptions;
  private originalBranch: string = "main";

  constructor(options: CloneOptions) {
    this.options = {
      depth: 1,
      keepTempDir: false,
      ...options,
    };
  }

  /**
   * Clone the repository to a temp directory
   */
  async cloneRepository(): Promise<string> {
    // Create temp directory
    this.tempDir = await mkdtemp(join(tmpdir(), "copilot-test-"));
    console.log(`📁 Created temp directory: ${this.tempDir}`);

    // Extract repo name from URL
    const repoName = basename(this.options.repoUrl, ".git").replace(/\.git$/, "");
    this.repoPath = join(this.tempDir, repoName);

    // Build clone command
    const cloneArgs = ["clone"];
    if (this.options.depth) {
      cloneArgs.push(`--depth=${this.options.depth}`);
    }
    if (this.options.branch) {
      cloneArgs.push(`--branch=${this.options.branch}`);
    }
    cloneArgs.push(this.options.repoUrl, this.repoPath);

    console.log(`📦 Cloning repository: ${this.options.repoUrl}`);
    try {
      execSync(`git ${cloneArgs.join(" ")}`, { stdio: "pipe" });
      console.log(`✅ Repository cloned to: ${this.repoPath}`);

      // Get the current branch name
      this.originalBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: this.repoPath,
        encoding: "utf-8",
      }).trim();

      return this.repoPath;
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error}`);
    }
  }

  /**
   * Get the cloned repository path
   */
  getRepoPath(): string {
    if (!this.repoPath) {
      throw new Error("Repository not cloned yet. Call cloneRepository() first.");
    }
    return this.repoPath;
  }

  /**
   * Create a test branch for modifications
   */
  async createTestBranch(testCaseId: string, model: string): Promise<string> {
    if (!this.repoPath) throw new Error("Repository not cloned");

    // Sanitize branch name
    const branchName = `copilot-test/${testCaseId}/${model}`.replace(/[^a-zA-Z0-9\-\/]/g, "-");

    try {
      // Reset to original state first
      execSync(`git checkout ${this.originalBranch}`, { cwd: this.repoPath, stdio: "pipe" });
      execSync("git clean -fd", { cwd: this.repoPath, stdio: "pipe" });
      execSync("git checkout .", { cwd: this.repoPath, stdio: "pipe" });

      // Create and checkout new branch
      execSync(`git checkout -B ${branchName}`, { cwd: this.repoPath, stdio: "pipe" });
      return branchName;
    } catch (error) {
      console.warn(`⚠️ Failed to create branch: ${error}`);
      return this.originalBranch;
    }
  }

  /**
   * Apply code changes from a Copilot response
   */
  async applyCodeChanges(
    response: string,
    targetFile?: string
  ): Promise<FileChange[]> {
    if (!this.repoPath) throw new Error("Repository not cloned");

    const changes: FileChange[] = [];

    // Extract code blocks from response
    const codeBlocks = this.extractCodeBlocks(response);

    for (const block of codeBlocks) {
      try {
        // Determine the file path
        let filePath = block.filePath || targetFile;
        if (!filePath) {
          // Try to infer from language
          filePath = this.inferFilePath(block.language, block.suggestedName);
        }
        if (!filePath) continue;

        const fullPath = join(this.repoPath, filePath);
        const dirPath = join(this.repoPath, filePath.split("/").slice(0, -1).join("/"));

        // Check if file exists
        const existed = existsSync(fullPath);
        let originalContent: string | undefined;

        if (existed) {
          originalContent = await readFile(fullPath, "utf-8");
        } else {
          // Create directory if needed
          if (dirPath && !existsSync(dirPath)) {
            await mkdir(dirPath, { recursive: true });
          }
        }

        // Write the new content
        await writeFile(fullPath, block.code);

        // Get the diff
        const diff = await this.getDiff(filePath);

        changes.push({
          filePath,
          changeType: existed ? "modified" : "added",
          originalContent,
          newContent: block.code,
          diff,
          linesAdded: (diff.match(/^\+[^+]/gm) || []).length,
          linesRemoved: (diff.match(/^-[^-]/gm) || []).length,
        });
      } catch (error) {
        console.warn(`⚠️ Failed to apply code block: ${error}`);
      }
    }

    return changes;
  }

  /**
   * Extract code blocks from markdown response
   */
  private extractCodeBlocks(
    response: string
  ): Array<{ code: string; language: string; filePath?: string; suggestedName?: string }> {
    const blocks: Array<{ code: string; language: string; filePath?: string; suggestedName?: string }> = [];

    // Match code blocks with optional file path in comments or headers
    const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
    const filePathRegex = /(?:\/\/|#|<!--)\s*(?:file|path|filename):\s*([^\s\n]+)|###?\s*(?:File|file):\s*[`']?([^\s`'\n]+)/gi;

    let match;
    while ((match = codeBlockRegex.exec(response)) !== null) {
      const language = match[1] || "";
      const code = match[2].trim();

      // Look for file path in the text before this code block
      const textBefore = response.slice(Math.max(0, match.index - 200), match.index);
      const filePathMatch = filePathRegex.exec(textBefore);
      filePathRegex.lastIndex = 0;

      // Also check for file path in a header pattern
      const headerMatch = textBefore.match(/(?:File|file|Path|path)[:\s]+[`']?([^\s`'\n]+)[`']?\s*$/);

      blocks.push({
        code,
        language,
        filePath: filePathMatch?.[1] || filePathMatch?.[2] || headerMatch?.[1],
        suggestedName: this.extractFunctionOrClassName(code),
      });
    }

    return blocks;
  }

  /**
   * Extract function or class name from code for file naming
   */
  private extractFunctionOrClassName(code: string): string | undefined {
    // Try to find function name
    const funcMatch = code.match(/(?:function|const|let|var)\s+(\w+)/);
    if (funcMatch) return funcMatch[1];

    // Try to find class name
    const classMatch = code.match(/class\s+(\w+)/);
    if (classMatch) return classMatch[1];

    // Try to find export name
    const exportMatch = code.match(/export\s+(?:default\s+)?(?:function|class|const)\s+(\w+)/);
    if (exportMatch) return exportMatch[1];

    return undefined;
  }

  /**
   * Infer file path from language and name
   */
  private inferFilePath(language: string, suggestedName?: string): string | undefined {
    const extensions: Record<string, string> = {
      typescript: ".ts",
      javascript: ".js",
      python: ".py",
      java: ".java",
      go: ".go",
      rust: ".rs",
      cpp: ".cpp",
      c: ".c",
      ruby: ".rb",
      php: ".php",
      swift: ".swift",
      kotlin: ".kt",
      tsx: ".tsx",
      jsx: ".jsx",
    };

    const ext = extensions[language.toLowerCase()];
    if (!ext) return undefined;

    const name = suggestedName || `generated_${Date.now()}`;
    return `src/${name}${ext}`;
  }

  /**
   * Get git diff for a file
   */
  async getDiff(filePath: string): Promise<string> {
    if (!this.repoPath) return "";

    try {
      // Stage the file first to include new files
      execSync(`git add "${filePath}"`, { cwd: this.repoPath, stdio: "pipe" });

      // Get the diff
      const diff = execSync(`git diff --cached --no-color "${filePath}"`, {
        cwd: this.repoPath,
        encoding: "utf-8",
      });

      return diff;
    } catch (error) {
      return "";
    }
  }

  /**
   * Get all uncommitted changes as a single diff
   */
  async getAllDiffs(): Promise<string> {
    if (!this.repoPath) return "";

    try {
      // Stage all changes
      execSync("git add -A", { cwd: this.repoPath, stdio: "pipe" });

      // Get combined diff
      const diff = execSync("git diff --cached --no-color", {
        cwd: this.repoPath,
        encoding: "utf-8",
      });

      return diff;
    } catch {
      return "";
    }
  }

  /**
   * Reset repository to clean state
   */
  async resetToClean(): Promise<void> {
    if (!this.repoPath) return;

    try {
      execSync("git reset --hard HEAD", { cwd: this.repoPath, stdio: "pipe" });
      execSync("git clean -fd", { cwd: this.repoPath, stdio: "pipe" });
      execSync(`git checkout ${this.originalBranch}`, { cwd: this.repoPath, stdio: "pipe" });
    } catch (error) {
      console.warn(`⚠️ Failed to reset repository: ${error}`);
    }
  }

  /**
   * Get repository statistics
   */
  async getRepoStats(): Promise<{
    totalFiles: number;
    languages: Record<string, number>;
    lastCommit: string;
  }> {
    if (!this.repoPath) throw new Error("Repository not cloned");

    try {
      // Count files by extension
      const languages: Record<string, number> = {};
      const countFiles = async (dir: string): Promise<number> => {
        let count = 0;
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
          const fullPath = join(dir, entry.name);
          if (entry.isDirectory()) {
            count += await countFiles(fullPath);
          } else if (entry.isFile()) {
            count++;
            const ext = entry.name.split(".").pop() || "other";
            languages[ext] = (languages[ext] || 0) + 1;
          }
        }
        return count;
      };

      const totalFiles = await countFiles(this.repoPath);

      // Get last commit
      const lastCommit = execSync("git log -1 --format=%H", {
        cwd: this.repoPath,
        encoding: "utf-8",
      }).trim();

      return { totalFiles, languages, lastCommit };
    } catch {
      return { totalFiles: 0, languages: {}, lastCommit: "" };
    }
  }

  /**
   * Cleanup temp directory
   */
  async cleanup(): Promise<void> {
    if (this.tempDir && !this.options.keepTempDir) {
      try {
        await rm(this.tempDir, { recursive: true, force: true });
        console.log(`🧹 Cleaned up temp directory: ${this.tempDir}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup temp directory: ${error}`);
      }
    } else if (this.tempDir) {
      console.log(`📁 Keeping temp directory for inspection: ${this.tempDir}`);
    }
    this.tempDir = null;
    this.repoPath = null;
  }
}
