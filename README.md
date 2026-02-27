# Copilot Model Testing CLI

# THIS IS A PROOF OF CONCEPT! - Verify Results for Accuracy

A TypeScript-based CLI framework for testing GitHub Copilot models for **model risk management** and evaluation. It runs configurable JSON test suites, optionally clones target repositories, applies generated changes, validates responses, and produces comprehensive reports.

## ✨ Key Features

- 🤖 **Multi-model testing** - Test multiple Copilot models simultaneously or sequentially
- ⚡ **Parallel execution** - Run models in parallel for faster testing cycles
- 📂 **Repository cloning** - Automatically clone and test against real repositories
- ✅ **Pattern validation** - Validate responses with expected/forbidden patterns
- 📊 **Rich reporting** - Generate HTML, Markdown, JSON, or CSV reports
- 🔄 **Code application** - Apply and capture diffs of generated code changes
- 🏷️ **Test categorization** - Organize tests by category and tags
- 🔍 **Repository context** - Include code context from repositories in prompts

## Prerequisites

- Node.js 18+
- A GitHub Copilot subscription
- GitHub CLI (`gh`) authenticated (required for API model discovery)

## Installation

### Global Installation (Recommended)

```bash
# Install globally from npm
npm install -g @copilot/model-testing

# Or use npx without installing
npx @copilot/model-testing --help
```

### Local Development

```bash
# Clone and install
git clone https://github.com/copilot/model-testing.git
cd model-testing
npm install
npm run build

# Link globally for development
npm link
```

### Shell Completion (Optional)

```bash
# Zsh (add to ~/.zshrc)
eval "$(copilot-test completion zsh)"

# Bash (add to ~/.bashrc)
eval "$(copilot-test completion bash)"

# Fish (save to completions directory)
copilot-test completion fish > ~/.config/fish/completions/copilot-test.fish
```

## Quick Start

```bash
# List available models
copilot-test models

# Create a sample test suite
copilot-test init -o my-tests.json

# Run tests
copilot-test run my-tests.json -m gpt-4o --format html --responses
```

## Usage

The CLI is available as `copilot-test` or the shorter alias `cpt`.

### List available models

```bash
copilot-test models

# output as JSON
copilot-test models --json
```

### Run a test suite

```bash
# run a suite with the default model
copilot-test run test-suites/clone-testing.json

# run with a specific model
copilot-test run test-suites/clone-testing.json -m claude-sonnet-4

# run multiple models sequentially
copilot-test run test-suites/clone-testing.json -m claude-sonnet-4,gpt-4o

# run multiple models in parallel (faster)
copilot-test run test-suites/clone-testing.json -m claude-sonnet-4,gpt-4o --parallel

# generate an HTML report with full responses
copilot-test run test-suites/clone-testing.json -f html -r -o reports/my-report

# use longer timeout for complex tests
copilot-test run test-suites/clone-testing.json --timeout 300000
```

### Validate a test suite configuration

```bash
copilot-test validate test-suites/clone-testing.json
```

### Create a sample test suite

```bash
copilot-test init -o my-test-suite.json
```

## Test suite configuration (JSON)

Test suites are defined as JSON. Example:

```json
{
  "name": "My Test Suite",
  "description": "Description of the test suite",
  "models": ["gpt-5.2", "claude-sonnet-4.5"],
  "repoClone": {
    "repoUrl": "https://github.com/org/repo",
    "branch": "main",
    "depth": 1,
    "keepTempDir": false
  },
  "options": {
    "timeoutMs": 120000,
    "retries": 1,
    "delayBetweenTestsMs": 2000,
    "parallelModels": false,
    "streaming": false
  },
  "testCases": [
    {
      "id": "test-001",
      "name": "Generate utility function",
      "category": "Code Generation",
      "prompt": "Create a function that...",
      "expectedBehavior": "Should generate...",
      "applyChanges": true,
      "targetFile": "src/utils/myUtil.ts",
      "expectedPatterns": ["function", "export"],
      "forbiddenPatterns": ["eval", "exec"],
      "tags": ["utility", "typescript"],
      "systemMessage": "You are an expert TypeScript developer",
      "testType": "code-generation"
    }
  ]
}
```

See [SCHEMA.md](SCHEMA.md) for complete configuration reference and [USER_GUIDE.md](USER_GUIDE.md) for detailed usage examples.

## Available scripts and commands

### npm scripts

- `npm run build` — Compile TypeScript to `dist/`
- `npm run start` — Run the compiled CLI (`dist/cli.js`)
- `npm run dev` — Watch-mode TypeScript compilation
- `npm run test:run` — Shortcut for `node dist/cli.js run`
- `npm run test:validate` — Shortcut for `node dist/cli.js validate`
- `npm run init` — Shortcut for `node dist/cli.js init`

### CLI commands

- `models [--json]` — List available models (fetched from Copilot API)
- `run <config> [options]` — Execute a test suite
  - `-o, --output <path>` — Output file path (default: `./report`)
  - `-f, --format <format>` — Output format (markdown, html, json, csv)
  - `-r, --responses` — Include full responses in report
  - `-t, --timestamps` — Include timestamps in report
  - `--risk-analysis` — Include risk analysis in report
  - `--timeout <ms>` — Timeout per test (default: 60000)
  - `--retries <n>` — Number of retries on failure (default: 1)
  - `--delay <ms>` — Delay between tests in milliseconds (default: 500)
  - `-m, --models <models>` — Comma-separated list of models
  - `-i, --interactive` — Interactive model selection
  - `-a, --all-models` — Test all available models
  - `--parallel` — Run models in parallel
  - `--repo <path>` — Path to repository for code context
  - `--languages <langs>` — Comma-separated language filter for repo context
  - `--clone <url>` — Clone repository from URL for testing
  - `--branch <branch>` — Branch to checkout when cloning
  - `--keep-temp` — Keep temporary directory after tests (for debugging)
- `validate <config>` — Validate a config file
- `init [-o <path>]` — Generate a sample config
- `completion [shell]` — Generate shell completion (bash, zsh, fish)

For detailed documentation, see [USER_GUIDE.md](USER_GUIDE.md).

## Contributing

1. Fork the repo.
2. Create a branch: `git checkout -b feature/my-change`.
3. Make changes (keep them focused and consistent with existing style).
4. Build and validate:
   - `npm run build`
   - `npm run test:validate -- <path-to-config>` (or `npm run start -- validate <config>`)
5. Open a pull request with a clear description and rationale.

## License

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
