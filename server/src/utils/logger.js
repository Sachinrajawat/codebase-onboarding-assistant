// Tiny console logger with a consistent prefix. Swap for pino/winston in v2.
function stamp() {
  return new Date().toISOString();
}

// `TypeError: fetch failed` from Node's global fetch hides the real reason
// (ENOTFOUND, ECONNREFUSED, certificate, timeout, etc.) inside err.cause.
// `formatError` recursively unwraps causes so logs show the underlying
// network/DNS error instead of just "fetch failed".
function formatError(err) {
  if (!err) return String(err);
  const parts = [];
  let current = err;
  while (current) {
    const stack = current.stack || `${current.name || "Error"}: ${current.message}`;
    parts.push(stack);
    const next = current.cause;
    if (!next || next === current) break;
    parts.push("Caused by:");
    current = next;
  }
  return parts.join("\n");
}

const logger = {
  info: (...args) => console.log(`[${stamp()}] [info]`, ...args),
  warn: (...args) => console.warn(`[${stamp()}] [warn]`, ...args),
  error: (...args) => console.error(`[${stamp()}] [error]`, ...args),
  debug: (...args) => {
    if (process.env.LOG_LEVEL === "debug") {
      console.log(`[${stamp()}] [debug]`, ...args);
    }
  },
  formatError,
};

module.exports = logger;
