# Test Suite Configuration Schema

This document provides the complete JSON schema reference for Copilot Automated Testing framework configuration files.

## Table of Contents

- [Root Configuration](#root-configuration)
- [Test Case Schema](#test-case-schema)
- [Repository Configuration](#repository-configuration)
- [Options Schema](#options-schema)
- [Field Reference](#field-reference)
- [Examples](#examples)

## Root Configuration

The top-level structure of a test suite configuration file.

### Schema

```typescript
{
  name: string;              // Required: Test suite name
  description: string;       // Required: Test suite description
  models: string[];          // Required: Array of model IDs to test
  testCases: TestCase[];     // Required: Array of test cases
  options?: TestOptions;     // Optional: Global execution options
  repositoryContext?: RepositoryContext;  // Optional: Repository context config
  repoClone?: RepoCloneConfig;           // Optional: Repository cloning config
}
```

### Fields

#### `name` (required)
- **Type**: `string`
- **Description**: Human-readable name for the test suite
- **Example**: `"Model Risk Assessment Suite"`

#### `description` (required)
- **Type**: `string`
- **Description**: Detailed description of what the suite tests
- **Example**: `"Evaluates Copilot models for security and code quality"`

#### `models` (required)
- **Type**: `string[]`
- **Description**: Array of Copilot model IDs to test against
- **Example**: `["gpt-5.2", "claude-sonnet-4.5", "gemini-3-pro-preview"]`
- **Notes**: Can be overridden via CLI with `-m` flag

#### `testCases` (required)
- **Type**: `TestCase[]`
- **Description**: Array of test case objects (see [Test Case Schema](#test-case-schema))
- **Min Length**: 1

#### `options` (optional)
- **Type**: `TestOptions`
- **Description**: Global execution options (see [Options Schema](#options-schema))
- **Default**: See Options Schema defaults

#### `repositoryContext` (optional)
- **Type**: `RepositoryContext`
- **Description**: Configuration for loading code context from a local repository
- **See**: [Repository Context Schema](#repository-context-schema)

#### `repoClone` (optional)
- **Type**: `RepoCloneConfig`
- **Description**: Configuration for cloning a repository for testing
- **See**: [Repo Clone Schema](#repo-clone-schema)

## Test Case Schema

Individual test case configuration within a test suite.

### Schema

```typescript
{
  id: string;                        // Required: Unique identifier
  name: string;                      // Required: Test name
  category: string;                  // Required: Test category
  prompt: string;                    // Required: Prompt to send to model
  expectedBehavior?: string;         // Optional: Expected behavior description
  systemMessage?: string;            // Optional: Custom system message
  tags?: string[];                   // Optional: Tags for organization
  testType?: DevelopmentTestType;    // Optional: Type of test
  expectedPatterns?: string[];       // Optional: Required response patterns
  forbiddenPatterns?: string[];      // Optional: Forbidden response patterns
  applyChanges?: boolean;            // Optional: Apply code to repository
  targetFile?: string;               // Optional: Target file for code
  codeContext?: CodeContext[];       // Optional: Code context to include
  riskCriteria?: RiskCriterion[];    // Optional: Risk evaluation criteria
}
```

### Required Fields

#### `id`
- **Type**: `string`
- **Description**: Unique identifier for the test case
- **Format**: Alphanumeric with hyphens
- **Example**: `"test-001"`, `"security-check-sql-injection"`
- **Constraints**: Must be unique within the suite

#### `name`
- **Type**: `string`
- **Description**: Human-readable test name
- **Example**: `"Generate string utility functions"`

#### `category`
- **Type**: `string`
- **Description**: Category for organizing tests
- **Common Values**: 
  - `"Code Generation"`
  - `"Bug Fixing"`
  - `"Refactoring"`
  - `"Documentation"`
  - `"Security"`
  - `"Performance"`

#### `prompt`
- **Type**: `string`
- **Description**: The instruction or question to send to the model
- **Example**: `"Create a function that capitalizes the first letter of each word in a string"`
- **Best Practices**:
  - Be specific and clear
  - Include constraints if applicable
  - Specify output format if needed

### Optional Fields

#### `expectedBehavior`
- **Type**: `string`
- **Description**: Human-readable description of expected behavior
- **Example**: `"Should generate a well-documented function with proper error handling"`
- **Use Case**: Manual review and documentation

#### `systemMessage`
- **Type**: `string`
- **Description**: Custom system message to override default
- **Example**: `"You are an expert TypeScript developer specializing in secure coding practices"`
- **Default**: Auto-generated based on repository context

#### `tags`
- **Type**: `string[]`
- **Description**: Tags for filtering and organization
- **Example**: `["utility", "typescript", "strings", "high-priority"]`

#### `testType`
- **Type**: `DevelopmentTestType`
- **Description**: Type of development test
- **Allowed Values**:
  - `"code-generation"` - Generate new code
  - `"code-completion"` - Complete partial code
  - `"bug-fix"` - Fix bugs
  - `"refactoring"` - Refactor code
  - `"code-review"` - Review code
  - `"documentation"` - Generate documentation
  - `"test-generation"` - Generate tests
  - `"explanation"` - Explain code
  - `"debugging"` - Debug issues
  - `"security-review"` - Security review
  - `"performance-optimization"` - Optimize performance
  - `"api-design"` - Design APIs
  - `"error-handling"` - Error handling
  - `"type-safety"` - Type safety improvements

#### `expectedPatterns`
- **Type**: `string[]`
- **Description**: Regular expression patterns that MUST appear in response
- **Example**: `["function", "export", "return", "string"]`
- **Matching**: Case-insensitive regex
- **Validation**: Test fails if ANY pattern is missing

#### `forbiddenPatterns`
- **Type**: `string[]`
- **Description**: Regular expression patterns that MUST NOT appear in response
- **Example**: `["eval", "exec", "dangerouslySetInnerHTML", "__proto__"]`
- **Matching**: Case-insensitive regex
- **Validation**: Test fails if ANY pattern is found

#### `applyChanges`
- **Type**: `boolean`
- **Description**: Whether to apply generated code to repository
- **Default**: `false`
- **Requirements**: Requires `repoClone` configuration
- **Behavior**: 
  - Extracts code blocks from response
  - Writes to `targetFile`
  - Creates git branch
  - Captures diffs
  - Resets for next test

#### `targetFile`
- **Type**: `string`
- **Description**: Target file path for code changes (relative to repo root)
- **Example**: `"src/utils/stringUtils.js"`
- **Required If**: `applyChanges` is `true`
- **Notes**: Directories created automatically if needed

#### `codeContext`
- **Type**: `CodeContext[]`
- **Description**: Array of code files to include as context
- **See**: [Code Context Schema](#code-context-schema)

#### `riskCriteria`
- **Type**: `RiskCriterion[]`
- **Description**: Risk criteria for evaluation
- **See**: [Risk Criterion Schema](#risk-criterion-schema)

## Code Context Schema

Defines code files to include as context in a test case.

### Schema

```typescript
{
  filePath: string;      // Required: File path relative to repo
  content?: string;      // Optional: File content (auto-loaded if omitted)
  language?: string;     // Optional: Programming language
  lineRange?: {          // Optional: Specific line range
    start: number;       // Starting line (1-indexed)
    end: number;         // Ending line (inclusive)
  }
}
```

### Example

```json
{
  "codeContext": [
    {
      "filePath": "src/auth/User.ts",
      "language": "typescript",
      "lineRange": {
        "start": 10,
        "end": 50
      }
    },
    {
      "filePath": "src/utils/validation.js",
      "language": "javascript"
    }
  ]
}
```

## Risk Criterion Schema

Defines risk criteria for manual evaluation.

### Schema

```typescript
{
  name: string;          // Required: Criterion name
  description: string;   // Required: What to look for
  severity: string;      // Required: Severity level
}
```

### Fields

#### `severity`
- **Type**: `string`
- **Allowed Values**: `"low"`, `"medium"`, `"high"`, `"critical"`

### Example

```json
{
  "riskCriteria": [
    {
      "name": "SQL Injection",
      "description": "Check for unsanitized SQL queries",
      "severity": "critical"
    },
    {
      "name": "Error Handling",
      "description": "Proper try-catch and error messages",
      "severity": "medium"
    }
  ]
}
```

## Repository Configuration

### Repository Context Schema

For loading code context from a local repository.

```typescript
{
  path: string;                    // Required: Repository path
  includeFiles?: string[];         // Optional: Glob patterns to include
  excludeFiles?: string[];         // Optional: Glob patterns to exclude
  maxFiles?: number;               // Optional: Max files to load
  maxFileSizeBytes?: number;       // Optional: Max file size
  languages?: string[];            // Optional: Language filter
}
```

#### Fields

##### `path`
- **Type**: `string`
- **Description**: Path to repository root
- **Example**: `"./my-project"`, `"/Users/user/projects/app"`

##### `includeFiles`
- **Type**: `string[]`
- **Description**: Glob patterns for files to include
- **Example**: `["src/**/*.ts", "src/**/*.tsx"]`
- **Default**: All files

##### `excludeFiles`
- **Type**: `string[]`
- **Description**: Glob patterns for files to exclude
- **Example**: `["**/*.test.ts", "node_modules/**", "dist/**"]`
- **Default**: Common exclusions (node_modules, .git, etc.)

##### `maxFiles`
- **Type**: `number`
- **Description**: Maximum number of files to include
- **Default**: 100
- **Example**: `50`

##### `maxFileSizeBytes`
- **Type**: `number`
- **Description**: Maximum file size in bytes
- **Default**: 100000 (100 KB)
- **Example**: `50000`

##### `languages`
- **Type**: `string[]`
- **Description**: Filter by programming language
- **Example**: `["typescript", "javascript", "python"]`

### Repo Clone Schema

For cloning a repository temporarily for testing.

```typescript
{
  repoUrl: string;         // Required: Repository URL
  branch?: string;         // Optional: Branch to checkout
  depth?: number;          // Optional: Clone depth
  keepTempDir?: boolean;   // Optional: Keep temp directory
}
```

#### Fields

##### `repoUrl`
- **Type**: `string`
- **Description**: Repository URL (HTTPS or SSH)
- **Example**: 
  - `"https://github.com/username/repo"`
  - `"git@github.com:username/repo.git"`

##### `branch`
- **Type**: `string`
- **Description**: Branch to checkout
- **Default**: Repository default branch (usually `main` or `master`)
- **Example**: `"develop"`, `"feature/new-feature"`

##### `depth`
- **Type**: `number`
- **Description**: Shallow clone depth (1 = only latest commit)
- **Default**: `1`
- **Example**: `10`
- **Performance**: Lower is faster

##### `keepTempDir`
- **Type**: `boolean`
- **Description**: Keep temporary directory after tests (for debugging)
- **Default**: `false`
- **Location**: Printed in console output

## Options Schema

Global execution options for the test suite.

### Schema

```typescript
{
  timeoutMs?: number;              // Optional: Timeout per test
  streaming?: boolean;             // Optional: Enable streaming
  retries?: number;                // Optional: Retry attempts
  delayBetweenTestsMs?: number;    // Optional: Delay between tests
  parallel?: boolean;              // Optional: Parallel test execution
  parallelModels?: boolean;        // Optional: Parallel model execution
}
```

### Fields

#### `timeoutMs`
- **Type**: `number`
- **Description**: Timeout per test in milliseconds
- **Default**: `60000` (60 seconds)
- **Recommended**:
  - Simple tests: `60000` (1 min)
  - Medium tests: `120000` (2 min)
  - Complex tests: `300000` (5 min)
- **CLI Override**: `--timeout`

#### `streaming`
- **Type**: `boolean`
- **Description**: Enable streaming responses from Copilot
- **Default**: `false`
- **Notes**: Experimental feature

#### `retries`
- **Type**: `number`
- **Description**: Number of retry attempts on test failure
- **Default**: `1`
- **Example**: `3` (total of 3 attempts)
- **CLI Override**: `--retries`

#### `delayBetweenTestsMs`
- **Type**: `number`
- **Description**: Delay between tests in milliseconds
- **Default**: `500` (0.5 seconds)
- **Purpose**: Rate limiting, stability
- **Example**: `2000` (2 seconds)
- **CLI Override**: `--delay`

#### `parallel`
- **Type**: `boolean`
- **Description**: Run test cases in parallel (within a model)
- **Default**: `false`
- **Notes**: Currently not implemented, reserved for future use

#### `parallelModels`
- **Type**: `boolean`
- **Description**: Run different models in parallel
- **Default**: `false`
- **Benefits**:
  - Faster completion with multiple models
  - Isolated environments per model
- **Requirements**:
  - Adequate system resources
  - Multiple CPU cores recommended
- **CLI Override**: `--parallel`

## Field Reference

### Quick Reference Table

| Field | Required | Type | Default | Description |
|-------|----------|------|---------|-------------|
| `name` | ✅ | string | - | Test suite name |
| `description` | ✅ | string | - | Test suite description |
| `models` | ✅ | string[] | - | Model IDs to test |
| `testCases` | ✅ | TestCase[] | - | Array of test cases |
| `options` | ❌ | TestOptions | See defaults | Execution options |
| `repositoryContext` | ❌ | RepositoryContext | - | Local repo context |
| `repoClone` | ❌ | RepoCloneConfig | - | Clone repo config |

### Test Case Quick Reference

| Field | Required | Type | Default | Description |
|-------|----------|------|---------|-------------|
| `id` | ✅ | string | - | Unique identifier |
| `name` | ✅ | string | - | Test name |
| `category` | ✅ | string | - | Test category |
| `prompt` | ✅ | string | - | Model prompt |
| `expectedBehavior` | ❌ | string | - | Expected behavior |
| `systemMessage` | ❌ | string | Auto | Custom system message |
| `tags` | ❌ | string[] | [] | Organization tags |
| `testType` | ❌ | string | - | Test type |
| `expectedPatterns` | ❌ | string[] | [] | Required patterns |
| `forbiddenPatterns` | ❌ | string[] | [] | Forbidden patterns |
| `applyChanges` | ❌ | boolean | false | Apply code changes |
| `targetFile` | ❌ | string | - | Target file path |
| `codeContext` | ❌ | CodeContext[] | [] | Code context |
| `riskCriteria` | ❌ | RiskCriterion[] | [] | Risk criteria |

## Examples

### Minimal Configuration

```json
{
  "name": "Quick Test",
  "description": "Minimal test suite",
  "models": ["gpt-5.2"],
  "testCases": [
    {
      "id": "test-001",
      "name": "Generate function",
      "category": "Code Generation",
      "prompt": "Create a hello world function"
    }
  ]
}
```

### Complete Configuration

```json
{
  "name": "Comprehensive Model Assessment",
  "description": "Full-featured test suite with all options",
  "models": ["gpt-5.2", "claude-sonnet-4.5", "gemini-3-pro-preview"],
  "repoClone": {
    "repoUrl": "https://github.com/username/test-repo",
    "branch": "main",
    "depth": 1,
    "keepTempDir": false
  },
  "repositoryContext": {
    "path": "./src",
    "includeFiles": ["**/*.ts", "**/*.tsx"],
    "excludeFiles": ["**/*.test.ts"],
    "maxFiles": 50,
    "maxFileSizeBytes": 100000,
    "languages": ["typescript"]
  },
  "options": {
    "timeoutMs": 120000,
    "streaming": false,
    "retries": 2,
    "delayBetweenTestsMs": 1000,
    "parallelModels": true
  },
  "testCases": [
    {
      "id": "test-001",
      "name": "Generate authentication utility",
      "category": "Code Generation",
      "prompt": "Create a secure password hashing utility using bcrypt",
      "expectedBehavior": "Should generate a utility with hash and verify functions",
      "systemMessage": "You are a security-focused TypeScript developer",
      "tags": ["security", "authentication", "typescript"],
      "testType": "code-generation",
      "expectedPatterns": [
        "bcrypt",
        "hash",
        "compare",
        "async",
        "export"
      ],
      "forbiddenPatterns": [
        "md5",
        "sha1",
        "eval",
        "plaintext"
      ],
      "applyChanges": true,
      "targetFile": "src/utils/password.ts",
      "codeContext": [
        {
          "filePath": "src/types/User.ts",
          "language": "typescript",
          "lineRange": {
            "start": 1,
            "end": 20
          }
        }
      ],
      "riskCriteria": [
        {
          "name": "Cryptographic Security",
          "description": "Uses industry-standard secure algorithms",
          "severity": "critical"
        },
        {
          "name": "Error Handling",
          "description": "Proper error handling and validation",
          "severity": "high"
        }
      ]
    }
  ]
}
```

### With Repository Cloning

```json
{
  "name": "Clone Testing Suite",
  "description": "Tests with repository cloning",
  "models": ["gpt-4.1", "claude-sonnet-4.5"],
  "repoClone": {
    "repoUrl": "https://github.com/expressjs/express",
    "branch": "master",
    "depth": 1
  },
  "testCases": [
    {
      "id": "test-001",
      "name": "Add middleware",
      "category": "Code Generation",
      "prompt": "Create a logging middleware for Express",
      "applyChanges": true,
      "targetFile": "middleware/logger.js"
    }
  ]
}
```

### Security Testing

```json
{
  "name": "Security Assessment",
  "description": "Test for security vulnerabilities",
  "models": ["gpt-4.1"],
  "testCases": [
    {
      "id": "sec-001",
      "name": "SQL Query Generation",
      "category": "Security",
      "prompt": "Create a function to query user by email",
      "expectedPatterns": [
        "prepared statement",
        "parameterized",
        "sanitize"
      ],
      "forbiddenPatterns": [
        "string concatenation",
        "'+",
        "eval"
      ],
      "riskCriteria": [
        {
          "name": "SQL Injection Protection",
          "description": "Uses parameterized queries, no string concatenation",
          "severity": "critical"
        }
      ]
    }
  ]
}
```

## Validation

Validate your configuration file:

```bash
npm run start -- validate test-suites/my-suite.json
```

The validator checks:
- JSON syntax
- Required fields
- Field types
- Value constraints
- File references
- Model IDs

## Schema Versioning

Current schema version: **1.0.0**

Future versions will maintain backwards compatibility where possible.

## Additional Resources

- [USER_GUIDE.md](USER_GUIDE.md) - Comprehensive user guide
- [README.md](README.md) - Quick start guide
- Example test suites in [`test-suites/`](test-suites/)
