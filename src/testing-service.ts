/**
 * Model Testing Service
 * Handles execution of test cases against Copilot models
 */

import { CopilotClient, CopilotSession } from "@github/copilot-sdk";
import { randomUUID } from "crypto";
import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type {
  TestCase,
  TestResult,
  TestSuiteConfig,
  TestSuiteResult,
  TestSummary,
  RunMetadata,
  TestOptions,
  ValidationResult,
  CodeContext,
  CodeChangeResult,
} from "./types.js";
import { RepositoryContextService } from "./repository-context.js";
import { RepositoryManager } from "./repository-manager.js";

// Get the bundled CLI path from the SDK's dependencies
function getBundledCliPath(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  // Navigate from dist/ to node_modules/@github/copilot/index.js
  return join(__dirname, "..", "node_modules", "@github", "copilot", "index.js");
}


const DEFAULT_OPTIONS: TestOptions = {
  timeoutMs: 60000,
  streaming: false,
  retries: 1,
  delayBetweenTestsMs: 500,
  parallel: false,
  parallelModels: false,
};

export class ModelTestingService {
  private client: CopilotClient | null = null;
  private options: TestOptions;
  private cliPath: string;
  private repoContext: RepositoryContextService | null = null;
  private repoFiles: Map<string, CodeContext> = new Map();
  private repoManager: RepositoryManager | null = null;
  private workingDirectory: string | null = null;

  constructor(options: Partial<TestOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.cliPath = process.env.COPILOT_CLI_PATH || getBundledCliPath();
  }

  /**
   * Initialize the Copilot client
   * @param cwd - Optional working directory for Copilot to operate in (defaults to process.cwd())
   */
  async initialize(cwd?: string): Promise<void> {
    // Stop existing client if reinitializing
    if (this.client) {
      await this.client.stop();
      this.client = null;
    }

    this.workingDirectory = cwd || null;
    console.log(`📍 Using Copilot CLI: ${this.cliPath}`);
    if (cwd) {
      console.log(`📂 Copilot working directory: ${cwd}`);
    }
    
    this.client = new CopilotClient({
      logLevel: "error",
      cliPath: "node",
      cliArgs: [this.cliPath],
      cwd: cwd, // Set working directory for file operations
    });
    await this.client.start();
    console.log("✅ Copilot client initialized");
  }

  /**
   * Clone a repository for testing
   */
  async cloneRepository(config: TestSuiteConfig): Promise<string | null> {
    if (config.repoClone) {
      this.repoManager = new RepositoryManager(config.repoClone);
      const repoPath = await this.repoManager.cloneRepository();

      // Reinitialize client with cloned repo as working directory
      // This ensures Copilot's file operations happen in the cloned repo, not the current workspace
      await this.initialize(repoPath);

      // Also set up repository context from the cloned repo
      config.repositoryContext = {
        ...config.repositoryContext,
        path: repoPath,
      };

      return repoPath;
    }
    return null;
  }

  /**
   * Load repository context for development testing
   */
  async loadRepositoryContext(config: TestSuiteConfig): Promise<void> {
    if (config.repositoryContext) {
      this.repoContext = new RepositoryContextService(config.repositoryContext);
      this.repoFiles = await this.repoContext.loadRepository();
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.client) {
      await this.client.stop();
      this.client = null;
      console.log("🧹 Copilot client stopped");
    }
    if (this.repoManager) {
      await this.repoManager.cleanup();
      this.repoManager = null;
    }
  }

  /**
   * Build the prompt with code context
   */
  private buildPromptWithContext(testCase: TestCase): string {
    let prompt = testCase.prompt;

    // Add code context if specified
    if (testCase.codeContext && testCase.codeContext.length > 0) {
      const contextParts: string[] = [];

      for (const ctx of testCase.codeContext) {
        // Try to get content from loaded repo files if not provided
        let content = ctx.content;
        if (!content && this.repoFiles.has(ctx.filePath)) {
          content = this.repoFiles.get(ctx.filePath)?.content;
        }

        if (content) {
          let codeBlock = content;

          // Handle line range
          if (ctx.lineRange) {
            const lines = content.split("\n");
            codeBlock = lines.slice(ctx.lineRange.start - 1, ctx.lineRange.end).join("\n");
          }

          contextParts.push(
            `### File: \`${ctx.filePath}\`\n\`\`\`${ctx.language || ""}\n${codeBlock}\n\`\`\``
          );
        }
      }

      if (contextParts.length > 0) {
        prompt = `**Code Context:**\n\n${contextParts.join("\n\n")}\n\n---\n\n**Task:**\n${prompt}`;
      }
    }

    return prompt;
  }

  /**
   * Validate response against expected and forbidden patterns
   */
  private validateResponse(testCase: TestCase, response: string): ValidationResult {
    const matchedPatterns: string[] = [];
    const missingPatterns: string[] = [];
    const foundForbiddenPatterns: string[] = [];

    // Check expected patterns
    if (testCase.expectedPatterns) {
      for (const pattern of testCase.expectedPatterns) {
        const regex = new RegExp(pattern, "i");
        if (regex.test(response)) {
          matchedPatterns.push(pattern);
        } else {
          missingPatterns.push(pattern);
        }
      }
    }

    // Check forbidden patterns
    if (testCase.forbiddenPatterns) {
      for (const pattern of testCase.forbiddenPatterns) {
        const regex = new RegExp(pattern, "i");
        if (regex.test(response)) {
          foundForbiddenPatterns.push(pattern);
        }
      }
    }

    return {
      expectedPatternsMatched: missingPatterns.length === 0,
      matchedPatterns,
      missingPatterns,
      hasForbiddenPatterns: foundForbiddenPatterns.length > 0,
      foundForbiddenPatterns,
    };
  }

  /**
   * Run a single test case against a specific model
   */
  async runTest(testCase: TestCase, model: string): Promise<TestResult> {
    if (!this.client) {
      throw new Error("Client not initialized. Call initialize() first.");
    }

    const startTime = Date.now();
    let session: CopilotSession | null = null;
    let response = "";
    let reasoning = "";
    let success = true;
    let error: string | undefined;
    let sessionId: string | undefined;
    let validation: ValidationResult | undefined;
    let codeChanges: CodeChangeResult[] | undefined;

    try {
      // Build prompt with code context
      const fullPrompt = this.buildPromptWithContext(testCase);

      // Build system message with repo summary if available
      let systemMessage = testCase.systemMessage || "";
      if (this.repoContext && !systemMessage) {
        systemMessage = `You are an expert software developer. ${this.repoContext.getRepositorySummary()}. Provide accurate, well-structured code and explanations.`;
      }

      // Create session with specified model
      session = await this.client.createSession({
        model,
        streaming: this.options.streaming,
        ...(systemMessage
          ? {
              systemMessage: {
                mode: "append" as const,
                content: systemMessage,
              },
            }
          : {}),
      });

      sessionId = session.sessionId;

      // Collect response events
      const responsePromise = new Promise<{ content: string; reasoning: string }>(
        (resolve, reject) => {
          let content = "";
          let reasoningContent = "";
          const timeout = setTimeout(() => {
            reject(new Error(`Test timed out after ${this.options.timeoutMs}ms`));
          }, this.options.timeoutMs);

          session!.on((event) => {
            if (event.type === "assistant.message") {
              content = (event.data as { content: string }).content;
            } else if (event.type === "assistant.reasoning") {
              reasoningContent = (event.data as { content: string }).content;
            } else if (event.type === "assistant.message_delta" && this.options.streaming) {
              content += (event.data as { deltaContent: string }).deltaContent;
            } else if (event.type === "session.idle") {
              clearTimeout(timeout);
              resolve({ content, reasoning: reasoningContent });
            } else if (event.type === "session.error") {
              clearTimeout(timeout);
              reject(new Error((event.data as { message: string }).message));
            }
          });
        }
      );

      // Send the test prompt
      await session.send({ prompt: fullPrompt });

      // Wait for response
      const result = await responsePromise;
      response = result.content;
      reasoning = result.reasoning;

      // Validate response patterns
      if (testCase.expectedPatterns || testCase.forbiddenPatterns) {
        validation = this.validateResponse(testCase, response);
        // Mark as failed if validation fails
        if (!validation.expectedPatternsMatched || validation.hasForbiddenPatterns) {
          success = false;
          const issues: string[] = [];
          if (validation.missingPatterns.length > 0) {
            issues.push(`Missing expected patterns: ${validation.missingPatterns.join(", ")}`);
          }
          if (validation.foundForbiddenPatterns.length > 0) {
            issues.push(`Found forbidden patterns: ${validation.foundForbiddenPatterns.join(", ")}`);
          }
          error = issues.join("; ");
        }
      }

      // Apply code changes and capture diffs if enabled
      if (testCase.applyChanges && this.repoManager && response) {
        try {
          // Create a test branch for isolation
          await this.repoManager.createTestBranch(testCase.id, model);

          // Apply the generated code
          const changes = await this.repoManager.applyCodeChanges(response, testCase.targetFile);

          if (changes.length > 0) {
            codeChanges = changes;
            console.log(`  📝 Applied ${changes.length} code change(s)`);
          }

          // Reset to clean state for next test
          await this.repoManager.resetToClean();
        } catch (changeError) {
          console.warn(`  ⚠️ Could not apply code changes: ${changeError instanceof Error ? changeError.message : String(changeError)}`);
        }
      }
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
    } finally {
      if (session) {
        try {
          await session.destroy();
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    return {
      testCase,
      model,
      response,
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
      success,
      error,
      sessionId,
      reasoning: reasoning || undefined,
      validation,
      codeChanges,
    };
  }

  /**
   * Run a test with retries
   */
  async runTestWithRetries(testCase: TestCase, model: string): Promise<TestResult> {
    let lastResult: TestResult | null = null;
    const retries = this.options.retries ?? 1;

    for (let attempt = 1; attempt <= retries; attempt++) {
      lastResult = await this.runTest(testCase, model);
      
      if (lastResult.success) {
        return lastResult;
      }

      if (attempt < retries) {
        console.log(`  ⚠️ Retry ${attempt}/${retries - 1} for test "${testCase.name}" on ${model}`);
        await this.delay(1000); // Wait before retry
      }
    }

    return lastResult!;
  }

  /**
   * Run all tests in a suite
   */
  async runSuite(config: TestSuiteConfig): Promise<TestSuiteResult> {
    const runId = randomUUID();
    const startTime = new Date();
    const results: TestResult[] = [];

    console.log(`\n🚀 Starting test suite: ${config.name}`);
    console.log(`   Models: ${config.models.join(", ")}`);
    console.log(`   Test cases: ${config.testCases.length}`);
    console.log(`   Total tests: ${config.models.length * config.testCases.length}\n`);

    // Merge options
    const suiteOptions = { ...this.options, ...config.options };
    this.options = suiteOptions;

    // Clone repository if specified
    if (config.repoClone) {
      console.log(`📂 Cloning repository: ${config.repoClone.repoUrl}`);
      const repoPath = await this.cloneRepository(config);
      if (repoPath) {
        console.log(`   ✅ Cloned to: ${repoPath}`);
      }
    }

    // Load repository context if specified
    if (config.repositoryContext) {
      await this.loadRepositoryContext(config);
    }

    // Run tests - either in parallel or sequentially
    if (suiteOptions.parallelModels) {
      // Parallel execution of models
      await this.runModelsInParallel(config, suiteOptions, results);
    } else {
      // Sequential execution of models
      await this.runModelsSequentially(config, suiteOptions, results);
    }

    const endTime = new Date();

    // Calculate summary
    const summary = this.calculateSummary(results, startTime, endTime);

    // Build metadata
    const metadata: RunMetadata = {
      runId,
      startTime,
      endTime,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
      },
    };

    return {
      suite: config,
      results,
      summary,
      metadata,
    };
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    results: TestResult[],
    startTime: Date,
    endTime: Date
  ): TestSummary {
    const passed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    // Group by model
    const byModel: Record<string, { passed: number; failed: number }> = {};
    for (const result of results) {
      if (!byModel[result.model]) {
        byModel[result.model] = { passed: 0, failed: 0 };
      }
      if (result.success) {
        byModel[result.model].passed++;
      } else {
        byModel[result.model].failed++;
      }
    }

    // Group by category
    const byCategory: Record<string, { passed: number; failed: number }> = {};
    for (const result of results) {
      const category = result.testCase.category;
      if (!byCategory[category]) {
        byCategory[category] = { passed: 0, failed: 0 };
      }
      if (result.success) {
        byCategory[category].passed++;
      } else {
        byCategory[category].failed++;
      }
    }

    // Calculate average response time
    const successfulResults = results.filter((r) => r.success);
    const avgResponseTimeMs =
      successfulResults.length > 0
        ? successfulResults.reduce((sum, r) => sum + r.durationMs, 0) /
          successfulResults.length
        : 0;

    return {
      totalTests: results.length,
      passed,
      failed,
      byModel,
      byCategory,
      avgResponseTimeMs: Math.round(avgResponseTimeMs),
      totalDurationMs: endTime.getTime() - startTime.getTime(),
    };
  }

  /**
   * Run models sequentially
   */
  private async runModelsSequentially(
    config: TestSuiteConfig,
    suiteOptions: TestOptions,
    results: TestResult[]
  ): Promise<void> {
    for (let i = 0; i < config.models.length; i++) {
      const model = config.models[i];
      console.log(`\n📦 Testing model: ${model}`);
      
      for (const testCase of config.testCases) {
        console.log(`   🧪 Running: ${testCase.name}`);
        
        const result = await this.runTestWithRetries(testCase, model);
        results.push(result);

        if (result.success) {
          console.log(`      ✅ Passed (${result.durationMs}ms)`);
        } else {
          console.log(`      ❌ Failed: ${result.error}`);
        }

        // Delay between tests
        if (suiteOptions.delayBetweenTestsMs) {
          await this.delay(suiteOptions.delayBetweenTestsMs);
        }
      }

      // Clean up and re-clone repository between models (except for the last model)
      if (config.repoClone && i < config.models.length - 1 && this.repoManager) {
        console.log(`\n🧹 Cleaning up repository for next model...`);
        await this.repoManager.cleanup();
        
        console.log(`📂 Re-cloning repository for next model: ${config.repoClone.repoUrl}`);
        this.repoManager = new RepositoryManager(config.repoClone);
        const repoPath = await this.repoManager.cloneRepository();
        if (repoPath) {
          console.log(`   ✅ Re-cloned to: ${repoPath}`);
          
          // Reinitialize client with new repo path as working directory
          await this.initialize(repoPath);
          
          // Reload repository context for the new clone
          config.repositoryContext = {
            ...config.repositoryContext,
            path: repoPath,
          };
          if (config.repositoryContext) {
            this.repoContext = new RepositoryContextService(config.repositoryContext);
            this.repoFiles = await this.repoContext.loadRepository();
          }
        }
      }
    }
  }

  /**
   * Run models in parallel
   */
  private async runModelsInParallel(
    config: TestSuiteConfig,
    suiteOptions: TestOptions,
    results: TestResult[]
  ): Promise<void> {
    // Each model gets its own isolated environment
    const modelPromises = config.models.map(async (model) => {
      const modelResults: TestResult[] = [];
      
      // Create isolated repository manager and context for this model
      let modelRepoManager: RepositoryManager | null = null;
      let modelRepoContext: RepositoryContextService | null = null;
      let modelRepoFiles: Map<string, CodeContext> = new Map();
      
      try {
        console.log(`\n📦 [${model}] Starting model tests...`);
        
        // Clone repository for this model if specified
        if (config.repoClone) {
          modelRepoManager = new RepositoryManager(config.repoClone);
          const repoPath = await modelRepoManager.cloneRepository();
          console.log(`   [${model}] ✅ Cloned to: ${repoPath}`);
          
          // Set up isolated context for this model
          const modelConfig = {
            ...config.repositoryContext,
            path: repoPath,
          };
          
          if (modelConfig.path) {
            modelRepoContext = new RepositoryContextService(modelConfig);
            modelRepoFiles = await modelRepoContext.loadRepository();
          }
        }
        
        // Run tests for this model
        for (const testCase of config.testCases) {
          console.log(`   [${model}] 🧪 Running: ${testCase.name}`);
          
          // Temporarily set the model-specific context
          const originalRepoManager = this.repoManager;
          const originalRepoContext = this.repoContext;
          const originalRepoFiles = this.repoFiles;
          
          this.repoManager = modelRepoManager;
          this.repoContext = modelRepoContext;
          this.repoFiles = modelRepoFiles;
          
          try {
            const result = await this.runTestWithRetries(testCase, model);
            modelResults.push(result);

            if (result.success) {
              console.log(`      [${model}] ✅ Passed (${result.durationMs}ms)`);
            } else {
              console.log(`      [${model}] ❌ Failed: ${result.error}`);
            }

            // Delay between tests
            if (suiteOptions.delayBetweenTestsMs) {
              await this.delay(suiteOptions.delayBetweenTestsMs);
            }
          } finally {
            // Restore original context
            this.repoManager = originalRepoManager;
            this.repoContext = originalRepoContext;
            this.repoFiles = originalRepoFiles;
          }
        }
        
        console.log(`   [${model}] ✅ Completed all tests`);
      } finally {
        // Clean up this model's repository
        if (modelRepoManager) {
          console.log(`   [${model}] 🧹 Cleaning up repository...`);
          await modelRepoManager.cleanup();
        }
      }
      
      return modelResults;
    });
    
    // Wait for all models to complete
    const allModelResults = await Promise.all(modelPromises);
    
    // Flatten results into the main results array
    for (const modelResults of allModelResults) {
      results.push(...modelResults);
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
