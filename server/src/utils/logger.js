// Tiny console logger with a consistent prefix. Swap for pino/winston in v2.
function stamp() {
  return new Date().toISOString();
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
};

module.exports = logger;
