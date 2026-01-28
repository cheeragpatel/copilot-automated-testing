/**
 * Repository Context Service
 * Loads and manages code context from a repository for testing
 */

import { readFile, readdir, stat } from "fs/promises";
import { join, extname, relative } from "path";
import { existsSync } from "fs";
import type { RepositoryContext, CodeContext } from "./types.js";

// Language detection by file extension
const LANGUAGE_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".py": "python",
  ".java": "java",
  ".go": "go",
  ".rs": "rust",
  ".cpp": "cpp",
  ".c": "c",
  ".h": "c",
  ".hpp": "cpp",
  ".cs": "csharp",
  ".rb": "ruby",
  ".php": "php",
  ".swift": "swift",
  ".kt": "kotlin",
  ".scala": "scala",
  ".r": "r",
  ".sql": "sql",
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "zsh",
  ".ps1": "powershell",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".json": "json",
  ".xml": "xml",
  ".html": "html",
  ".css": "css",
  ".scss": "scss",
  ".md": "markdown",
};

// Default exclusion patterns
const DEFAULT_EXCLUDES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  "coverage",
  "__pycache__",
  ".pytest_cache",
  "venv",
  ".venv",
  "target",
  "vendor",
  ".idea",
  ".vscode",
  "*.min.js",
  "*.min.css",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
];

export class RepositoryContextService {
  private repoPath: string;
  private config: RepositoryContext;
  private loadedFiles: Map<string, CodeContext> = new Map();

  constructor(config: RepositoryContext) {
    this.repoPath = config.path;
    this.config = {
      maxFiles: 50,
      maxFileSizeBytes: 100 * 1024, // 100KB default
      excludeFiles: DEFAULT_EXCLUDES,
      ...config,
    };
  }

  /**
   * Load all relevant files from the repository
   */
  async loadRepository(): Promise<Map<string, CodeContext>> {
    if (!existsSync(this.repoPath)) {
      throw new Error(`Repository path does not exist: ${this.repoPath}`);
    }

    console.log(`📂 Loading repository context from: ${this.repoPath}`);
    await this.scanDirectory(this.repoPath);
    console.log(`✅ Loaded ${this.loadedFiles.size} files`);

    return this.loadedFiles;
  }

  /**
   * Recursively scan a directory for code files
   */
  private async scanDirectory(dirPath: string): Promise<void> {
    if (this.loadedFiles.size >= (this.config.maxFiles || 50)) {
      return;
    }

    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (this.loadedFiles.size >= (this.config.maxFiles || 50)) {
        break;
      }

      const fullPath = join(dirPath, entry.name);
      const relativePath = relative(this.repoPath, fullPath);

      // Check exclusions - pass isDirectory flag to allow directory traversal
      if (this.shouldExclude(relativePath, entry.name, entry.isDirectory())) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.scanDirectory(fullPath);
      } else if (entry.isFile()) {
        await this.loadFile(fullPath, relativePath);
      }
    }
  }

  /**
   * Check if a path should be excluded (for directories, only checks exclude patterns)
   */
  private shouldExclude(relativePath: string, name: string, isDirectory: boolean = false): boolean {
    const excludePatterns = this.config.excludeFiles || DEFAULT_EXCLUDES;

    for (const pattern of excludePatterns) {
      if (pattern.includes("*")) {
        // Simple glob matching
        const regex = new RegExp(
          "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
        );
        if (regex.test(name) || regex.test(relativePath)) {
          return true;
        }
      } else {
        if (name === pattern || relativePath.includes(pattern)) {
          return true;
        }
      }
    }

    // Check include patterns only for files, not directories
    // Directories should be traversed to find matching files inside them
    if (!isDirectory && this.config.includeFiles && this.config.includeFiles.length > 0) {
      const ext = extname(name);
      const matchesInclude = this.config.includeFiles.some((pattern) => {
        if (pattern.startsWith("*.")) {
          return ext === pattern.slice(1);
        }
        return relativePath.includes(pattern) || name === pattern;
      });
      if (!matchesInclude) {
        return true;
      }
    }

    return false;
  }

  /**
   * Load a single file if it matches criteria
   */
  private async loadFile(fullPath: string, relativePath: string): Promise<void> {
    const ext = extname(fullPath);
    const language = LANGUAGE_MAP[ext];

    // Skip if not a recognized code file
    if (!language) {
      return;
    }

    // Check language filter
    if (this.config.languages && this.config.languages.length > 0) {
      if (!this.config.languages.includes(language)) {
        return;
      }
    }

    // Check file size
    const stats = await stat(fullPath);
    if (stats.size > (this.config.maxFileSizeBytes || 100 * 1024)) {
      return;
    }

    // Load content
    try {
      const content = await readFile(fullPath, "utf-8");
      this.loadedFiles.set(relativePath, {
        filePath: relativePath,
        content,
        language,
      });
    } catch (error) {
      console.warn(`⚠️ Could not read file: ${relativePath}`);
    }
  }

  /**
   * Get a specific file's context
   */
  getFileContext(filePath: string): CodeContext | undefined {
    return this.loadedFiles.get(filePath);
  }

  /**
   * Get all loaded files
   */
  getAllFiles(): CodeContext[] {
    return Array.from(this.loadedFiles.values());
  }

  /**
   * Get files by language
   */
  getFilesByLanguage(language: string): CodeContext[] {
    return this.getAllFiles().filter((f) => f.language === language);
  }

  /**
   * Format code context for prompt injection
   */
  formatForPrompt(contexts: CodeContext[]): string {
    if (contexts.length === 0) {
      return "";
    }

    let formatted = "\n\n---\n**Code Context:**\n";

    for (const ctx of contexts) {
      formatted += `\n### File: \`${ctx.filePath}\`\n`;
      if (ctx.lineRange) {
        const lines = ctx.content?.split("\n") || [];
        const selectedLines = lines.slice(ctx.lineRange.start - 1, ctx.lineRange.end);
        formatted += `\`\`\`${ctx.language || ""}\n${selectedLines.join("\n")}\n\`\`\`\n`;
      } else {
        formatted += `\`\`\`${ctx.language || ""}\n${ctx.content || ""}\n\`\`\`\n`;
      }
    }

    return formatted;
  }

  /**
   * Get repository summary for system context
   */
  getRepositorySummary(): string {
    const files = this.getAllFiles();
    const languageCounts: Record<string, number> = {};

    for (const file of files) {
      const lang = file.language || "unknown";
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    }

    const languageSummary = Object.entries(languageCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([lang, count]) => `${lang}: ${count} files`)
      .join(", ");

    return `Repository contains ${files.length} code files (${languageSummary})`;
  }
}
