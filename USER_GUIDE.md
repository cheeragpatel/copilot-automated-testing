# Copilot Automated Testing - User Guide

This guide provides comprehensive documentation for using the Copilot Automated Testing framework to evaluate and test GitHub Copilot models for model risk management.

## Table of Contents

- [Getting Started](#getting-started)
- [Understanding Test Suites](#understanding-test-suites)
- [Test Case Configuration](#test-case-configuration)
- [Running Tests](#running-tests)
- [Model Selection](#model-selection)
- [Repository Testing](#repository-testing)
- [Parallel Testing](#parallel-testing)
- [Report Formats](#report-formats)
- [Advanced Features](#advanced-features)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd copilot-automated-testing

# Install dependencies
npm install

# Build the project
npm run build
```

### Quick Start

```bash
# List available models
npm run start -- models

# Run a test suite
npm run start -- run test-suites/clone-testing.json

# Generate an HTML report
npm run start -- run test-suites/clone-testing.json -f html -r -o reports/my-report
```

## Understanding Test Suites

A test suite is a JSON configuration file that defines:

- **Models to test**: Which Copilot models to evaluate
- **Test cases**: Individual tests to run against each model
- **Repository context**: Code repositories to clone or analyze
- **Validation rules**: Expected/forbidden patterns in responses
- **Execution options**: Timeouts, retries, parallel execution

### Basic Structure

```json
{
  "name": "My Test Suite",
  "description": "Description of what this suite tests",
  "models": ["gpt-5.2", "claude-sonnet-4.5"],
  "testCases": [
    {
      "id": "test-001",
      "name": "Test name",
      "category": "Code Generation",
      "prompt": "Your test prompt here",
      "expectedPatterns": ["expected", "patterns"],
      "forbiddenPatterns": ["forbidden", "patterns"]
    }
  ],
  "options": {
    "timeoutMs": 120000,
    "retries": 1,
    "parallelModels": false
  }
}
```

## Test Case Configuration

### Required Fields

- **`id`**: Unique identifier for the test case (e.g., "test-001")
- **`name`**: Human-readable test name
- **`category`**: Test category for organization
- **`prompt`**: The instruction/question to send to the model

### Optional Fields

#### Validation

- **`expectedBehavior`**: Description of expected behavior (human review)
- **`expectedPatterns`**: Array of regex patterns that MUST appear in response
- **`forbiddenPatterns`**: Array of regex patterns that MUST NOT appear in response

```json
{
  "expectedPatterns": ["function", "export", "return"],
  "forbiddenPatterns": ["eval", "exec", "dangerouslySetInnerHTML"]
}
```

#### Code Generation

- **`applyChanges`**: Boolean - apply generated code to repository
- **`targetFile`**: Path where code should be written (relative to repo root)
- **`testType`**: Type of development test (see Test Types below)

```json
{
  "applyChanges": true,
  "targetFile": "src/utils/stringUtils.js",
  "testType": "code-generation"
}
```

#### Context & Customization

- **`systemMessage`**: Custom system message for this test
- **`tags`**: Array of tags for filtering and organization
- **`codeContext`**: Array of code files to include as context

```json
{
  "systemMessage": "You are an expert TypeScript developer specializing in React.",
  "tags": ["react", "typescript", "hooks"],
  "codeContext": [
    {
      "filePath": "src/components/Button.tsx",
      "language": "typescript"
    }
  ]
}
```

### Test Types

Available test types for the `testType` field:

- `code-generation` - Generate new code
- `code-completion` - Complete partial code
- `bug-fix` - Fix identified bugs
- `refactoring` - Refactor existing code
- `code-review` - Review code for issues
- `documentation` - Generate documentation
- `test-generation` - Generate unit tests
- `explanation` - Explain code or concepts
- `debugging` - Debug code issues
- `security-review` - Review for security issues
- `performance-optimization` - Optimize performance
- `api-design` - Design API interfaces
- `error-handling` - Implement error handling
- `type-safety` - Add/improve type safety

## Running Tests

### Basic Usage

```bash
# Run with default models from config
npm run start -- run test-suites/my-suite.json

# Run with specific models
npm run start -- run test-suites/my-suite.json -m gpt-4.1,claude-sonnet-4.5

# Run with custom timeout
npm run start -- run test-suites/my-suite.json --timeout 180000
```

### Command-Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --models <models>` | Comma-separated model list | Config file |
| `--parallel` | Run models in parallel | `false` |
| `-f, --format <format>` | Report format (markdown/html/json/csv) | `markdown` |
| `-r, --responses` | Include full responses in report | `false` |
| `--timeout <ms>` | Timeout per test | `60000` |
| `--retries <n>` | Retry attempts on failure | `1` |
| `--delay <ms>` | Delay between tests | `500` |
| `-i, --interactive` | Interactive model selection | `false` |
| `-a, --all-models` | Test all available models | `false` |

### Examples

```bash
# Interactive model selection
npm run start -- run test-suites/my-suite.json -i

# Test all available models
npm run start -- run test-suites/my-suite.json -a

# Generate detailed HTML report with responses
npm run start -- run test-suites/my-suite.json -f html -r -o reports/detailed-report

# Run with high timeout and retries
npm run start -- run test-suites/my-suite.json --timeout 300000 --retries 3
```

## Model Selection

### Listing Available Models

Models are always fetched live from the GitHub Copilot API:

```bash
# List available models (fetched from API)
npm run start -- models

# Output as JSON
npm run start -- models --json
```

### Specifying Models

**In config file:**
```json
{
  "models": ["gpt-5.2", "claude-sonnet-4.5", "gemini-3-pro-preview"]
}
```

**Via command line:**
```bash
# Override config models
npm run start -- run suite.json -m gpt-5.2,claude-sonnet-4.5

# Interactive selection
npm run start -- run suite.json -i

# All available models
npm run start -- run suite.json -a
```

## Repository Testing

### Cloning Repositories

Clone a repository temporarily for testing:

```json
{
  "repoClone": {
    "repoUrl": "https://github.com/username/repo",
    "branch": "main",
    "depth": 1,
    "keepTempDir": false
  }
}
```

**Options:**
- `repoUrl` - Repository URL (GitHub, GitLab, etc.)
- `branch` - Branch to checkout (default: main)
- `depth` - Shallow clone depth for speed (default: 1)
- `keepTempDir` - Keep temp directory after tests (debugging)

**Command line override:**
```bash
npm run start -- run suite.json --clone https://github.com/user/repo --branch develop
```

### Repository Context

Load existing repository for context:

```json
{
  "repositoryContext": {
    "path": "./my-project",
    "includeFiles": ["src/**/*.ts", "src/**/*.tsx"],
    "excludeFiles": ["**/*.test.ts", "**/*.spec.ts"],
    "maxFiles": 50,
    "maxFileSizeBytes": 100000,
    "languages": ["typescript", "javascript"]
  }
}
```

### Applying Code Changes

When `applyChanges` is true, the framework will:

1. Extract code blocks from the model response
2. Write them to the specified `targetFile`
3. Create a git branch for isolation
4. Capture diffs and statistics
5. Reset to clean state for next test

```json
{
  "testCases": [
    {
      "id": "test-001",
      "prompt": "Create a utility function for string manipulation",
      "applyChanges": true,
      "targetFile": "src/utils/stringUtils.js"
    }
  ]
}
```

## Parallel Testing

### Sequential vs Parallel

**Sequential (default):**
- Tests one model at a time
- Cleans up and re-clones repository between models
- Lower resource usage
- Easier to debug

**Parallel:**
- Tests all models simultaneously
- Each model gets isolated repository clone
- Faster completion time
- Higher resource usage

### Enabling Parallel Testing

**In config file:**
```json
{
  "options": {
    "parallelModels": true
  }
}
```

**Via command line:**
```bash
npm run start -- run suite.json -m model1,model2,model3 --parallel
```

### Performance Comparison

For 2 models × 8 test cases:

- **Sequential**: ~12 minutes
- **Parallel**: ~7-8 minutes

Speedup increases with more models.

### Resource Considerations

Parallel testing requires:
- Multiple concurrent Copilot sessions
- Multiple repository clones
- Adequate CPU and memory

Recommended for:
- Testing 2+ models
- Fast test completion
- CI/CD environments with resources

## Report Formats

### Markdown (default)

```bash
npm run start -- run suite.json -f markdown -o reports/report.md
```

Clean, readable format with:
- Summary statistics
- Per-model results
- Test case details
- Optional: full responses

### HTML

```bash
npm run start -- run suite.json -f html -r -o reports/report.html
```

Interactive report with:
- Collapsible sections
- Syntax highlighting
- Filtering and search
- Visual statistics
- Full responses (with `-r`)

### JSON

```bash
npm run start -- run suite.json -f json -o reports/report.json
```

Machine-readable format for:
- Further processing
- CI/CD integration
- Custom analysis
- Data export

### CSV

```bash
npm run start -- run suite.json -f csv -o reports/report.csv
```

Tabular format for:
- Spreadsheet analysis
- Data visualization
- Metrics tracking
- Reporting

## Advanced Features

### Risk Criteria Evaluation

Define risk criteria for manual evaluation:

```json
{
  "testCases": [
    {
      "id": "test-001",
      "prompt": "Generate authentication code",
      "riskCriteria": [
        {
          "name": "Security Vulnerabilities",
          "description": "Check for SQL injection, XSS, insecure storage",
          "severity": "critical"
        },
        {
          "name": "Error Handling",
          "description": "Proper error handling and logging",
          "severity": "medium"
        }
      ]
    }
  ]
}
```

### Code Context

Include specific code as context:

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
    }
  ]
}
```

### Custom System Messages

Override default system message per test:

```json
{
  "systemMessage": "You are a senior security engineer. Focus on secure coding practices and identify potential vulnerabilities."
}
```

### Retries and Delays

```json
{
  "options": {
    "retries": 3,
    "delayBetweenTestsMs": 2000
  }
}
```

## Best Practices

### Test Suite Design

1. **Start Small**: Begin with 5-10 test cases
2. **Clear Categories**: Organize by functionality (Code Generation, Bug Fixing, etc.)
3. **Specific Prompts**: Clear, unambiguous instructions
4. **Realistic Scenarios**: Use real-world use cases

### Model Selection

1. **Baseline Model**: Always include a known-good model
2. **Diverse Models**: Test different model types/sizes
3. **Version Tracking**: Document model versions tested

### Repository Testing

1. **Shallow Clones**: Use `depth: 1` for speed
2. **Cleanup**: Don't keep temp directories in CI/CD
3. **Branch Selection**: Test against stable branches

### Performance

1. **Timeouts**: Set based on test complexity
   - Simple: 60s
   - Medium: 120s
   - Complex: 300s
2. **Parallel Testing**: Use for 3+ models
3. **Delays**: Add delays to avoid rate limiting

### Validation

1. **Pattern Matching**: Use regex for flexible matching
2. **Security Patterns**: Always check for dangerous patterns
3. **Expected Behavior**: Document for human review

### Reporting

1. **Version Control**: Store reports in git
2. **Naming Convention**: Include date and model info
3. **Full Responses**: Enable for detailed analysis
4. **Multiple Formats**: Generate HTML for viewing, JSON for processing

## Troubleshooting

### Common Issues

**"Client not initialized"**
- Ensure Copilot client can start
- Check Node.js version (18+)
- Verify dependencies installed

**"Test timed out"**
- Increase timeout: `--timeout 180000`
- Check network connectivity
- Verify model availability

**"Repository clone failed"**
- Check repository URL
- Verify git is installed
- Ensure network access
- Try different branch

**"Unknown models will be attempted"**
- This is a warning, not an error
- Models will still be tested
- Use `npm run start -- models --api` to see available models

### Debug Mode

Keep temporary directories for inspection:

```json
{
  "repoClone": {
    "keepTempDir": true
  }
}
```

### Validation

Validate your config before running:

```bash
npm run start -- validate test-suites/my-suite.json
```

### Performance Issues

If tests are slow:
1. Use shallow clones (`depth: 1`)
2. Reduce included files in repository context
3. Increase delays between tests
4. Use parallel testing for multiple models

### Memory Issues

If running out of memory:
1. Reduce `maxFiles` in repository context
2. Reduce `maxFileSizeBytes`
3. Don't run too many models in parallel
4. Close other applications

## Example Workflows

### Model Risk Assessment

```bash
# Comprehensive test with all models
npm run start -- models --api
npm run start -- run test-suites/model-risk-assessment.json -a --parallel -f html -r -o reports/risk-assessment
```

### Development Testing

```bash
# Quick test on current repo
npm run start -- run test-suites/development-testing.json --repo . -m gpt-4.1
```

### Continuous Integration

```bash
# CI-friendly command
npm run start -- run test-suites/ci-suite.json -m claude-sonnet-4.5 -f json -o reports/ci-results.json --timeout 300000
```

### Quick Comparison

```bash
# Compare two models
npm run start -- run test-suites/quick-clone-test.json -m gpt-5.2,claude-sonnet-4.5 --parallel -f html -o reports/comparison
```

## Additional Resources

- [SCHEMA.md](SCHEMA.md) - Complete JSON schema reference
- [README.md](README.md) - Quick start and overview
- [Example test suites](test-suites/) - Real-world examples

## Support

For issues or questions:
1. Check this guide
2. Review example test suites
3. Validate your configuration
4. Check logs for detailed errors
