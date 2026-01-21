/**
 * Report Generator
 * Generates formatted reports from test results
 */

import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import type {
  TestSuiteResult,
  TestResult,
  ReportOptions,
  OutputFormat,
} from "./types.js";

export class ReportGenerator {
  /**
   * Generate a report from test results
   */
  async generate(
    result: TestSuiteResult,
    options: ReportOptions
  ): Promise<string> {
    let content: string;

    switch (options.format) {
      case "markdown":
        content = this.generateMarkdown(result, options);
        break;
      case "html":
        content = this.generateHtml(result, options);
        break;
      case "json":
        content = this.generateJson(result, options);
        break;
      case "csv":
        content = this.generateCsv(result, options);
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }

    // Ensure output directory exists
    await mkdir(dirname(options.outputPath), { recursive: true });

    // Write to file
    await writeFile(options.outputPath, content, "utf-8");
    console.log(`\n📄 Report generated: ${options.outputPath}`);

    return content;
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdown(
    result: TestSuiteResult,
    options: ReportOptions
  ): string {
    const { suite, summary, metadata, results } = result;
    const lines: string[] = [];

    // Header
    lines.push(`# Model Risk Assessment Report`);
    lines.push("");
    lines.push(`## ${suite.name}`);
    lines.push("");
    lines.push(`${suite.description}`);
    lines.push("");

    // Metadata
    lines.push(`---`);
    lines.push("");
    lines.push(`**Run ID:** \`${metadata.runId}\``);
    lines.push(`**Date:** ${metadata.startTime.toISOString()}`);
    lines.push(`**Duration:** ${this.formatDuration(summary.totalDurationMs)}`);
    lines.push(`**Platform:** ${metadata.environment.platform}`);
    lines.push(`**Node Version:** ${metadata.environment.nodeVersion}`);
    lines.push("");

    // Summary
    lines.push(`## Executive Summary`);
    lines.push("");
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total Tests | ${summary.totalTests} |`);
    lines.push(`| Passed | ${summary.passed} ✅ |`);
    lines.push(`| Failed | ${summary.failed} ❌ |`);
    lines.push(`| Success Rate | ${this.percentage(summary.passed, summary.totalTests)} |`);
    lines.push(`| Avg Response Time | ${summary.avgResponseTimeMs}ms |`);
    lines.push("");

    // Results by Model
    lines.push(`## Results by Model`);
    lines.push("");
    lines.push(`| Model | Passed | Failed | Success Rate |`);
    lines.push(`|-------|--------|--------|--------------|`);
    for (const [model, stats] of Object.entries(summary.byModel)) {
      const total = stats.passed + stats.failed;
      lines.push(
        `| ${model} | ${stats.passed} | ${stats.failed} | ${this.percentage(stats.passed, total)} |`
      );
    }
    lines.push("");

    // Results by Category
    lines.push(`## Results by Category`);
    lines.push("");
    lines.push(`| Category | Passed | Failed | Success Rate |`);
    lines.push(`|----------|--------|--------|--------------|`);
    for (const [category, stats] of Object.entries(summary.byCategory)) {
      const total = stats.passed + stats.failed;
      lines.push(
        `| ${category} | ${stats.passed} | ${stats.failed} | ${this.percentage(stats.passed, total)} |`
      );
    }
    lines.push("");

    // Detailed Results
    lines.push(`## Detailed Test Results`);
    lines.push("");

    // Group by model
    const resultsByModel = this.groupByModel(results);

    for (const [model, modelResults] of Object.entries(resultsByModel)) {
      lines.push(`### ${model}`);
      lines.push("");

      for (const testResult of modelResults) {
        const icon = testResult.success ? "✅" : "❌";
        lines.push(`#### ${icon} ${testResult.testCase.name}`);
        lines.push("");
        lines.push(`- **Category:** ${testResult.testCase.category}`);
        lines.push(`- **Status:** ${testResult.success ? "Passed" : "Failed"}`);
        lines.push(`- **Duration:** ${testResult.durationMs}ms`);
        
        if (options.includeTimestamps) {
          lines.push(`- **Timestamp:** ${testResult.timestamp.toISOString()}`);
        }

        if (testResult.testCase.tags && testResult.testCase.tags.length > 0) {
          lines.push(`- **Tags:** ${testResult.testCase.tags.map(t => `\`${t}\``).join(", ")}`);
        }

        if (testResult.error) {
          lines.push(`- **Error:** ${testResult.error}`);
        }

        lines.push("");
        lines.push(`**Prompt:**`);
        lines.push("```");
        lines.push(testResult.testCase.prompt);
        lines.push("```");
        lines.push("");

        if (options.includeResponses && testResult.response) {
          lines.push(`**Response:**`);
          lines.push("```");
          lines.push(testResult.response);
          lines.push("```");
          lines.push("");
        }

        if (testResult.reasoning) {
          lines.push(`**Model Reasoning:**`);
          lines.push("```");
          lines.push(testResult.reasoning);
          lines.push("```");
          lines.push("");
        }

        // Code Changes / Diffs
        if (testResult.codeChanges && testResult.codeChanges.length > 0) {
          lines.push(`**Code Changes Applied:**`);
          lines.push("");
          for (const change of testResult.codeChanges) {
            lines.push(`##### ${change.changeType.toUpperCase()}: \`${change.filePath}\``);
            if (change.linesAdded !== undefined || change.linesRemoved !== undefined) {
              lines.push(`*Lines added: ${change.linesAdded || 0}, Lines removed: ${change.linesRemoved || 0}*`);
            }
            if (change.diff) {
              lines.push("");
              lines.push("```diff");
              lines.push(change.diff);
              lines.push("```");
            }
            lines.push("");
          }
        }

        if (testResult.testCase.expectedBehavior) {
          lines.push(`**Expected Behavior:**`);
          lines.push(testResult.testCase.expectedBehavior);
          lines.push("");
        }

        if (options.includeRiskAnalysis && testResult.testCase.riskCriteria) {
          lines.push(`**Risk Criteria:**`);
          lines.push("");
          for (const criterion of testResult.testCase.riskCriteria) {
            const severityIcon = this.getSeverityIcon(criterion.severity);
            lines.push(`- ${severityIcon} **${criterion.name}** (${criterion.severity}): ${criterion.description}`);
          }
          lines.push("");
        }

        lines.push("---");
        lines.push("");
      }
    }

    // Footer
    lines.push(`## Appendix`);
    lines.push("");
    lines.push(`### Models Tested`);
    lines.push("");
    for (const model of suite.models) {
      lines.push(`- ${model}`);
    }
    lines.push("");

    lines.push(`### Test Categories`);
    lines.push("");
    const categories = [...new Set(suite.testCases.map(tc => tc.category))];
    for (const category of categories) {
      const count = suite.testCases.filter(tc => tc.category === category).length;
      lines.push(`- **${category}:** ${count} test(s)`);
    }
    lines.push("");

    lines.push(`---`);
    lines.push(`*Report generated by Copilot Model Testing Framework*`);

    return lines.join("\n");
  }

  /**
   * Generate HTML report
   */
  private generateHtml(
    result: TestSuiteResult,
    options: ReportOptions
  ): string {
    const { suite, summary, metadata, results } = result;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Model Risk Assessment Report - ${suite.name}</title>
    <style>
        :root {
            --success-color: #22c55e;
            --error-color: #ef4444;
            --warning-color: #f59e0b;
            --info-color: #3b82f6;
            --bg-color: #f8fafc;
            --card-bg: #ffffff;
            --text-color: #1e293b;
            --border-color: #e2e8f0;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-color);
            color: var(--text-color);
            line-height: 1.6;
            padding: 2rem;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        h2 { font-size: 1.5rem; margin: 2rem 0 1rem; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem; }
        h3 { font-size: 1.25rem; margin: 1.5rem 0 1rem; }
        .card {
            background: var(--card-bg);
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            padding: 1.5rem;
            margin-bottom: 1rem;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }
        .stat {
            text-align: center;
            padding: 1rem;
            border-radius: 8px;
            background: var(--bg-color);
        }
        .stat-value { font-size: 2rem; font-weight: bold; }
        .stat-label { font-size: 0.875rem; color: #64748b; }
        .success { color: var(--success-color); }
        .error { color: var(--error-color); }
        table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color); }
        th { background: var(--bg-color); font-weight: 600; }
        .badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-error { background: #fee2e2; color: #991b1b; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .test-result { margin-bottom: 1.5rem; }
        .test-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
        pre {
            background: #1e293b;
            color: #e2e8f0;
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 0.875rem;
        }
        .meta { font-size: 0.875rem; color: #64748b; margin-bottom: 2rem; }
        .tag { 
            display: inline-block; 
            background: #e2e8f0; 
            padding: 0.125rem 0.5rem; 
            border-radius: 4px; 
            font-size: 0.75rem; 
            margin-right: 0.25rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Model Risk Assessment Report</h1>
        <h2 style="border: none; margin-top: 0.5rem;">${suite.name}</h2>
        <p class="meta">
            Run ID: ${metadata.runId}<br>
            Date: ${metadata.startTime.toISOString()}<br>
            Duration: ${this.formatDuration(summary.totalDurationMs)}
        </p>

        <h2>Executive Summary</h2>
        <div class="card">
            <div class="summary-grid">
                <div class="stat">
                    <div class="stat-value">${summary.totalTests}</div>
                    <div class="stat-label">Total Tests</div>
                </div>
                <div class="stat">
                    <div class="stat-value success">${summary.passed}</div>
                    <div class="stat-label">Passed</div>
                </div>
                <div class="stat">
                    <div class="stat-value error">${summary.failed}</div>
                    <div class="stat-label">Failed</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${this.percentage(summary.passed, summary.totalTests)}</div>
                    <div class="stat-label">Success Rate</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${summary.avgResponseTimeMs}ms</div>
                    <div class="stat-label">Avg Response Time</div>
                </div>
            </div>
        </div>

        <h2>Results by Model</h2>
        <div class="card">
            <table>
                <thead>
                    <tr><th>Model</th><th>Passed</th><th>Failed</th><th>Success Rate</th></tr>
                </thead>
                <tbody>
                    ${Object.entries(summary.byModel)
                      .map(([model, stats]) => {
                        const total = stats.passed + stats.failed;
                        return `<tr>
                            <td>${model}</td>
                            <td class="success">${stats.passed}</td>
                            <td class="error">${stats.failed}</td>
                            <td>${this.percentage(stats.passed, total)}</td>
                        </tr>`;
                      })
                      .join("")}
                </tbody>
            </table>
        </div>

        <h2>Detailed Results</h2>
        ${Object.entries(this.groupByModel(results))
          .map(
            ([model, modelResults]) => `
            <h3>${model}</h3>
            ${modelResults
              .map(
                (r) => `
                <div class="card test-result">
                    <div class="test-header">
                        <span class="badge ${r.success ? "badge-success" : "badge-error"}">
                            ${r.success ? "PASSED" : "FAILED"}
                        </span>
                        <strong>${r.testCase.name}</strong>
                        <span style="color: #64748b; font-size: 0.875rem;">(${r.durationMs}ms)</span>
                    </div>
                    <p style="margin: 0.5rem 0;"><strong>Category:</strong> ${r.testCase.category}</p>
                    ${r.testCase.tags?.map((t) => `<span class="tag">${t}</span>`).join("") || ""}
                    <h4 style="margin-top: 1rem;">Prompt</h4>
                    <pre>${this.escapeHtml(r.testCase.prompt)}</pre>
                    ${
                      options.includeResponses && r.response
                        ? `<h4>Response</h4><pre>${this.escapeHtml(r.response)}</pre>`
                        : ""
                    }
                    ${
                      r.codeChanges && r.codeChanges.length > 0
                        ? `<h4>Code Changes Applied</h4>
                           ${r.codeChanges.map(change => `
                             <div style="margin-bottom: 1rem;">
                               <strong>${change.changeType.toUpperCase()}:</strong> <code>${this.escapeHtml(change.filePath)}</code>
                               ${change.linesAdded !== undefined || change.linesRemoved !== undefined
                                 ? `<span style="color: #64748b; font-size: 0.875rem; margin-left: 0.5rem;">
                                      +${change.linesAdded || 0} / -${change.linesRemoved || 0} lines
                                    </span>`
                                 : ""
                               }
                               ${change.diff
                                 ? `<pre style="background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 4px; overflow-x: auto;">${this.formatDiff(change.diff)}</pre>`
                                 : ""
                               }
                             </div>
                           `).join("")}`
                        : ""
                    }
                    ${r.error ? `<p class="error"><strong>Error:</strong> ${this.escapeHtml(r.error)}</p>` : ""}
                </div>
            `
              )
              .join("")}
        `
          )
          .join("")}
    </div>
</body>
</html>`;
  }

  /**
   * Generate JSON report
   */
  private generateJson(
    result: TestSuiteResult,
    _options: ReportOptions
  ): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * Generate CSV report
   */
  private generateCsv(
    result: TestSuiteResult,
    options: ReportOptions
  ): string {
    const headers = [
      "Test ID",
      "Test Name",
      "Category",
      "Model",
      "Status",
      "Duration (ms)",
      "Timestamp",
      "Error",
    ];

    if (options.includeResponses) {
      headers.push("Prompt", "Response");
    }

    const rows = result.results.map((r) => {
      const row = [
        r.testCase.id,
        r.testCase.name,
        r.testCase.category,
        r.model,
        r.success ? "Passed" : "Failed",
        r.durationMs.toString(),
        r.timestamp.toISOString(),
        r.error || "",
      ];

      if (options.includeResponses) {
        row.push(this.csvEscape(r.testCase.prompt));
        row.push(this.csvEscape(r.response));
      }

      return row.map((cell) => this.csvEscape(String(cell))).join(",");
    });

    return [headers.join(","), ...rows].join("\n");
  }

  /**
   * Group results by model
   */
  private groupByModel(results: TestResult[]): Record<string, TestResult[]> {
    const grouped: Record<string, TestResult[]> = {};
    for (const result of results) {
      if (!grouped[result.model]) {
        grouped[result.model] = [];
      }
      grouped[result.model].push(result);
    }
    return grouped;
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Calculate percentage
   */
  private percentage(value: number, total: number): string {
    if (total === 0) return "0%";
    return `${Math.round((value / total) * 100)}%`;
  }

  /**
   * Get severity icon
   */
  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case "critical":
        return "🔴";
      case "high":
        return "🟠";
      case "medium":
        return "🟡";
      case "low":
        return "🟢";
      default:
        return "⚪";
    }
  }

  /**
   * Escape HTML
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Format diff with syntax highlighting for HTML
   */
  private formatDiff(diff: string): string {
    const lines = diff.split("\n");
    const coloredLines = lines.map((line) => {
      const escaped = this.escapeHtml(line);
      if (line.startsWith("+") && !line.startsWith("+++")) {
        return `<span style="color: #22c55e;">${escaped}</span>`;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        return `<span style="color: #ef4444;">${escaped}</span>`;
      } else if (line.startsWith("@@")) {
        return `<span style="color: #60a5fa;">${escaped}</span>`;
      } else if (line.startsWith("diff ") || line.startsWith("index ")) {
        return `<span style="color: #94a3b8;">${escaped}</span>`;
      }
      return escaped;
    });
    return coloredLines.join("\n");
  }

  /**
   * Escape CSV value
   */
  private csvEscape(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
