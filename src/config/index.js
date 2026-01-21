/**
 * Configuration module
 * - Loads values from process.env
 * - Provides sensible defaults
 * - Validates required variables
 * - Exports an immutable (deep-frozen) config object
 */

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const v = String(value).toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return defaultValue;
}

function parseInteger(value, defaultValue) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function deepFreeze(obj) {
  if (!obj || typeof obj !== "object" || Object.isFrozen(obj)) return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    // @ts-ignore - JS runtime deep-freeze helper
    deepFreeze(obj[key]);
  }
  return obj;
}

const REQUIRED_ENV_VARS = [];

function validateConfig(config, env) {
  const errors = [];

  // Required vars can be enforced by:
  // 1) editing REQUIRED_ENV_VARS above, or
  // 2) setting REQUIRED_ENV_VARS="A,B,C" in the environment.
  const requiredVars = Array.from(
    new Set([
      ...REQUIRED_ENV_VARS,
      ...String(env.REQUIRED_ENV_VARS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ]),
  );

  for (const name of requiredVars) {
    const value = env[name];
    if (value === undefined || value === null || String(value).trim() === "") {
      errors.push(`Missing required environment variable: ${name}`);
    }
  }

  if (config.port < 1 || config.port > 65535) {
    errors.push("PORT must be between 1 and 65535");
  }

  if (typeof config.host !== "string" || config.host.trim() === "") {
    errors.push("HOST must be a non-empty string");
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join("\n")}`);
  }
}

function buildConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || "development";

  const config = {
    nodeEnv,
    port: parseInteger(env.PORT, 3000),
    host: env.HOST || "localhost",
    debug: parseBoolean(env.DEBUG, nodeEnv !== "production"),
  };

  validateConfig(config, env);
  return config;
}

export const config = deepFreeze(buildConfig());
export default config;
