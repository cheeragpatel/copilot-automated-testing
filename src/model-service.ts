/**
 * Model Service
 * Handles fetching available Copilot models from the API
 */

import { CopilotClient, CopilotSession } from "@github/copilot-sdk";
import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Copilot API endpoint for models
const COPILOT_API_URL = "https://api.githubcopilot.com/models";
const INTEGRATION_ID = "copilot-developer-cli";

interface ApiModelResponse {
  data: ApiModel[];
}

interface ApiModel {
  id: string;
  name: string;
  capabilities?: {
    supports?: {
      vision?: boolean;
    };
    limits?: {
      max_prompt_tokens?: number;
      max_context_window_tokens?: number;
    };
  };
  policy?: {
    state: "enabled" | "disabled" | "unconfigured";
    terms?: string;
  };
}

// Get the bundled CLI path from the SDK's dependencies
function getBundledCliPath(): string {
  return join(__dirname, "..", "node_modules", "@github", "copilot", "index.js");
}

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  capabilities?: {
    supports?: {
      vision?: boolean;
    };
    limits?: {
      max_context_window_tokens?: number;
    };
  };
  policy?: {
    state: "enabled" | "disabled" | "unconfigured";
  };
}

export class ModelService {
  private client: CopilotClient | null = null;
  private cliPath: string;
  private oauthToken: string | null = null;

  constructor() {
    this.cliPath = process.env.COPILOT_CLI_PATH || getBundledCliPath();
  }

  /**
   * Get OAuth token from gh CLI
   */
  private getOAuthToken(): string {
    try {
      return execSync("gh auth token", { encoding: "utf-8" }).trim();
    } catch (error) {
      throw new Error(
        "Failed to get GitHub authentication. Please ensure you are logged in with 'gh auth login'"
      );
    }
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    // Get OAuth token
    try {
      this.oauthToken = this.getOAuthToken();
    } catch (error) {
      console.warn("⚠️  GitHub CLI auth not available");
      throw error;
    }

    // Initialize client for model validation
    this.client = new CopilotClient({
      logLevel: "error",
      cliPath: "node",
      cliArgs: [this.cliPath],
    });
    await this.client.start();
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.client) {
      await this.client.stop();
      this.client = null;
    }
  }

  /**
   * Fetch available models from the Copilot API directly
   */
  async getAvailableModels(): Promise<ModelInfo[]> {
    if (!this.oauthToken) {
      throw new Error("Not authenticated. Call initialize() first or run 'gh auth login'");
    }

    console.log("🔍 Fetching models from Copilot API...");
    
    try {
      const response = await fetch(COPILOT_API_URL, {
        headers: {
          "Authorization": `Bearer ${this.oauthToken}`,
          "Accept": "application/json",
          "Copilot-Integration-Id": INTEGRATION_ID,
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data: ApiModelResponse = await response.json();
      
      if (!data.data || data.data.length === 0) {
        throw new Error("No models returned from API");
      }

      // Filter to only enabled models, exclude embedding models and duplicates
      const seenIds = new Set<string>();
      const models = data.data
        .filter((model) => {
          // Skip embedding models (not usable for chat)
          if (model.id.includes("embedding")) {
            return false;
          }
          // Skip models that are not enabled
          if (model.policy?.state !== "enabled") {
            return false;
          }
          // Skip duplicates
          if (seenIds.has(model.id)) {
            return false;
          }
          seenIds.add(model.id);
          return true;
        })
        .map((model) => ({
          id: model.id,
          name: model.name || model.id,
          description: this.getModelDescription(model.id, model.capabilities),
          capabilities: model.capabilities,
          policy: model.policy ? { state: model.policy.state } : undefined,
        }));

      console.log(`✅ Found ${models.length} models from API`);
      return models;
    } catch (error) {
      console.error("❌ Failed to fetch models from API:", error);
      throw error;
    }
  }

  /**
   * Get a human-readable description for a model ID
   */
  private getModelDescription(modelId: string, capabilities?: ApiModel["capabilities"]): string {
    // Build description from capabilities if available
    const contextSize = capabilities?.limits?.max_context_window_tokens;
    const contextStr = contextSize 
      ? ` (${Math.round(contextSize / 1000)}k context)` 
      : "";
    
    const visionStr = capabilities?.supports?.vision ? " with vision" : "";
    
    // Check for known model patterns
    if (modelId.includes("claude-sonnet")) {
      return `Anthropic Sonnet model${visionStr}${contextStr}`;
    } else if (modelId.includes("claude-opus")) {
      return `Anthropic's most capable model${visionStr}${contextStr}`;
    } else if (modelId.includes("claude-haiku")) {
      return `Anthropic's fast, lightweight model${visionStr}${contextStr}`;
    } else if (modelId.includes("gpt-5.2-codex")) {
      return `OpenAI's latest coding-optimized model${visionStr}${contextStr}`;
    } else if (modelId.includes("gpt-5.2")) {
      return `OpenAI's flagship model${visionStr}${contextStr}`;
    } else if (modelId.includes("gpt-5.1-codex")) {
      return `Coding-optimized GPT-5.1${visionStr}${contextStr}`;
    } else if (modelId.includes("gpt-5.1")) {
      return `OpenAI GPT-5.1${visionStr}${contextStr}`;
    } else if (modelId.includes("gpt-5-mini")) {
      return `Compact GPT-5 variant${visionStr}${contextStr}`;
    } else if (modelId.includes("gpt-5")) {
      return `OpenAI GPT-5${visionStr}${contextStr}`;
    } else if (modelId.includes("gpt-4.1")) {
      return `OpenAI GPT-4.1${visionStr}${contextStr}`;
    } else if (modelId.includes("gpt-4o-mini")) {
      return `OpenAI's efficient mini model${visionStr}${contextStr}`;
    } else if (modelId.includes("gpt-4o")) {
      return `OpenAI GPT-4o${visionStr}${contextStr}`;
    } else if (modelId.includes("gpt-4")) {
      return `OpenAI GPT-4${visionStr}${contextStr}`;
    } else if (modelId.includes("gpt-3.5")) {
      return `OpenAI GPT-3.5${visionStr}${contextStr}`;
    } else if (modelId.includes("gemini")) {
      return `Google Gemini model${visionStr}${contextStr}`;
    }
    
    return `${modelId}${visionStr}${contextStr}`;
  }

  /**
   * Validate if a specific model is available by attempting to create a session
   */
  async validateModel(modelId: string): Promise<boolean> {
    if (!this.client) {
      throw new Error("Client not initialized. Call initialize() first.");
    }

    let session: CopilotSession | null = null;
    try {
      session = await this.client.createSession({ model: modelId });
      await session.destroy();
      return true;
    } catch {
      return false;
    } finally {
      if (session) {
        try {
          await session.destroy();
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }
}
