# Copilot Automated Testing

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

```bash
# install dependencies
npm install

# build the project
npm run build
```

## Usage

After building, run the CLI via `npm run start -- ...`.

### List available models

```bash
npm run start -- models

# output as JSON
npm run start -- models --json
```

### Run a test suite

```bash
# run a suite with the default model
npm run start -- run test-suites/clone-testing.json

# run with a specific model
npm run start -- run test-suites/clone-testing.json -m claude-sonnet-4.5

# run multiple models sequentially
npm run start -- run test-suites/clone-testing.json -m claude-sonnet-4.5,gpt-5.2

# run multiple models in parallel (faster)
npm run start -- run test-suites/clone-testing.json -m claude-sonnet-4.5,gpt-5.2 --parallel

# generate an HTML report with full responses
npm run start -- run test-suites/clone-testing.json -f html -r -o reports/my-report

# use longer timeout for complex tests
npm run start -- run test-suites/clone-testing.json --timeout 300000
```

### Validate a test suite configuration

```bash
npm run start -- validate test-suites/clone-testing.json
```

### Create a sample test suite

```bash
npm run start -- init -o my-test-suite.json
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
```

## Available scripts and commands

### npm scripts

- `npm run build` — Compile TypeScript to `dist/`
- `npm run start` — Run the compiled CLI (`dist/cli.js`)
- `npm run dev` — Watch-mode TypeScript compilation
- `npm run test:run` — Shortcut for `node dist/cli.js run`
- `npm run test:validate` — Shortcut for `node dist/cli.js validate`
- `npm run init` — Shortcut for `node dist/cli.js init`

### CLI commands

When running via `npm run start -- <command>`:

- `models [--json]` — List available models (fetched from Copilot API)
- `run <config> [options]` — Execute a test suite
  - `-m, --models <models>` — Comma-separated list of models
  - `--parallel` — Run models in parallel
  - `-f, --format <format>` — Output format (markdown, html, json, csv)
  - `-r, --responses` — Include full responses in report
  - `--timeout <ms>` — Timeout per test
  - `--retries <n>` — Number of retries on failure
  - `-i, --interactive` — Interactive model selection
  - `-a, --all-models` — Test all available models
- `validate <config>` — Validate a config file
- `init [-o <path>]` — Generate a sample config

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
