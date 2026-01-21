/**
 * Type definitions for the Copilot Model Testing Framework
 */

/**
 * Repository context for development-focused testing
 */
export interface RepositoryContext {
  /** Path to the repository root */
  path: string;
  /** Files to include as context (glob patterns or specific paths) */
  includeFiles?: string[];
  /** Files to exclude from context */
  excludeFiles?: string[];
  /** Maximum number of files to include */
  maxFiles?: number;
  /** Maximum size per file in bytes */
  maxFileSizeBytes?: number;
  /** Language filter (e.g., "typescript", "python") */
  languages?: string[];
}

/**
 * Code context to attach to a test case
 */
export interface CodeContext {
  /** File path relative to repository root */
  filePath: string;
  /** File content (loaded at runtime) */
  content?: string;
  /** Specific line range to focus on */
  lineRange?: { start: number; end: number };
  /** Language of the file */
  language?: string;
}

/**
 * A single test case to run against Copilot models
 */
export interface TestCase {
  /** Unique identifier for the test case */
  id: string;
  /** Human-readable name of the test */
  name: string;
  /** Category/group for organizing test cases */
  category: string;
  /** The prompt to send to the model */
  prompt: string;
  /** Optional system message customization */
  systemMessage?: string;
  /** Tags for filtering and organization */
  tags?: string[];
  /** Expected behavior description (for human review) */
  expectedBehavior?: string;
  /** Risk assessment criteria to evaluate */
  riskCriteria?: RiskCriterion[];
  /** Code context to include with the prompt */
  codeContext?: CodeContext[];
  /** Test type for development scenarios */
  testType?: DevelopmentTestType;
  /** Expected patterns in the response (for automated validation) */
  expectedPatterns?: string[];
  /** Patterns that should NOT appear in the response */
  forbiddenPatterns?: string[];
  /** Target file for code changes (if applicable) */
  targetFile?: string;
  /** Whether to apply generated code to the repository */
  applyChanges?: boolean;
}

/**
 * Development-focused test types
 */
export type DevelopmentTestType =
  | "code-generation"
  | "code-completion"
  | "bug-fix"
  | "refactoring"
  | "code-review"
  | "documentation"
  | "test-generation"
  | "explanation"
  | "debugging"
  | "security-review"
  | "performance-optimization"
  | "api-design"
  | "error-handling"
  | "type-safety";

/**
 * Risk criteria for evaluation
 */
export interface RiskCriterion {
  /** Name of the criterion */
  name: string;
  /** Description of what to look for */
  description: string;
  /** Severity level if violated */
  severity: "low" | "medium" | "high" | "critical";
}

/**
 * Repository clone configuration
 */
export interface RepoCloneConfig {
  /** Repository URL (GitHub, GitLab, etc.) */
  repoUrl: string;
  /** Branch to clone (default: main/master) */
  branch?: string;
  /** Shallow clone depth (default: 1 for speed) */
  depth?: number;
  /** Keep the temp directory after tests (for debugging) */
  keepTempDir?: boolean;
}

/**
 * Configuration for a test suite
 */
export interface TestSuiteConfig {
  /** Name of the test suite */
  name: string;
  /** Description of the test suite */
  description: string;
  /** Models to test against */
  models: string[];
  /** Test cases to run */
  testCases: TestCase[];
  /** Global configuration options */
  options?: TestOptions;
  /** Repository context for development testing */
  repositoryContext?: RepositoryContext;
  /** Clone a repository for testing (creates temp directory) */
  repoClone?: RepoCloneConfig;
}

/**
 * Test execution options
 */
export interface TestOptions {
  /** Timeout per test in milliseconds */
  timeoutMs?: number;
  /** Whether to enable streaming responses */
  streaming?: boolean;
  /** Number of retries on failure */
  retries?: number;
  /** Delay between tests in milliseconds */
  delayBetweenTestsMs?: number;
  /** Whether to run tests in parallel */
  parallel?: boolean;
  /** Whether to run models in parallel (default: false, sequential) */
  parallelModels?: boolean;
}

/**
 * Result of a single test execution
 */
export interface TestResult {
  /** Test case that was executed */
  testCase: TestCase;
  /** Model used for the test */
  model: string;
  /** The response from the model */
  response: string;
  /** Execution timestamp */
  timestamp: Date;
  /** Duration of execution in milliseconds */
  durationMs: number;
  /** Whether the test completed successfully */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Session ID from Copilot */
  sessionId?: string;
  /** Reasoning content if model supports it */
  reasoning?: string;
  /** Pattern validation results */
  validation?: ValidationResult;
  /** Code changes applied to repository */
  codeChanges?: CodeChangeResult[];
}

/**
 * Result of code changes applied to repository
 */
export interface CodeChangeResult {
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

/**
 * Validation result for pattern matching
 */
export interface ValidationResult {
  /** Whether all expected patterns were found */
  expectedPatternsMatched: boolean;
  /** Which expected patterns were found */
  matchedPatterns: string[];
  /** Which expected patterns were NOT found */
  missingPatterns: string[];
  /** Whether any forbidden patterns were found */
  hasForbiddenPatterns: boolean;
  /** Which forbidden patterns were found */
  foundForbiddenPatterns: string[];
}

/**
 * Aggregated results for a test suite run
 */
export interface TestSuiteResult {
  /** Suite configuration */
  suite: TestSuiteConfig;
  /** All test results */
  results: TestResult[];
  /** Summary statistics */
  summary: TestSummary;
  /** Run metadata */
  metadata: RunMetadata;
}

/**
 * Summary statistics for a test run
 */
export interface TestSummary {
  /** Total number of tests executed */
  totalTests: number;
  /** Number of successful tests */
  passed: number;
  /** Number of failed tests */
  failed: number;
  /** Number of tests per model */
  byModel: Record<string, { passed: number; failed: number }>;
  /** Number of tests per category */
  byCategory: Record<string, { passed: number; failed: number }>;
  /** Average response time in milliseconds */
  avgResponseTimeMs: number;
  /** Total execution time in milliseconds */
  totalDurationMs: number;
}

/**
 * Metadata about the test run
 */
export interface RunMetadata {
  /** Run identifier */
  runId: string;
  /** Start time */
  startTime: Date;
  /** End time */
  endTime: Date;
  /** Environment information */
  environment: {
    nodeVersion: string;
    platform: string;
    sdkVersion?: string;
  };
  /** User/operator who initiated the run */
  initiatedBy?: string;
}

/**
 * Output format options
 */
export type OutputFormat = "markdown" | "html" | "json" | "csv";

/**
 * Report generation options
 */
export interface ReportOptions {
  /** Output format */
  format: OutputFormat;
  /** Output file path */
  outputPath: string;
  /** Include full responses in report */
  includeResponses?: boolean;
  /** Include timestamps */
  includeTimestamps?: boolean;
  /** Include risk analysis */
  includeRiskAnalysis?: boolean;
}
