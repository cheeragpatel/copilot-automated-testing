const COLORS = {
  YELLOW: "\x1b[33m",
  RED: "\x1b[31m",
  RESET: "\x1b[0m",
};

function getTimestamp() {
  return new Date().toISOString();
}

function log(message) {
  console.log(`[${getTimestamp()}] ${message}`);
}

function warn(message) {
  console.warn(`${COLORS.YELLOW}[${getTimestamp()}] ${message}${COLORS.RESET}`);
}

function error(message) {
  console.error(`${COLORS.RED}[${getTimestamp()}] ${message}${COLORS.RESET}`);
}

function debug(message) {
  if (typeof process !== "undefined" && process.env && process.env.DEBUG != null) {
    console.debug(`[${getTimestamp()}] ${message}`);
  }
}

export { log, warn, error, debug };
export default { log, warn, error, debug };

// Optional CommonJS compatibility (e.g., when required from CJS contexts).
if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = { log, warn, error, debug };
}
