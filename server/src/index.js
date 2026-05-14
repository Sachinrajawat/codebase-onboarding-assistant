const express = require("express");
const cors = require("cors");

const env = require("./config/env");
const { connectMongo } = require("./config/db");
const logger = require("./utils/logger");

const reposRouter = require("./routes/repos");
const chatRouter = require("./routes/chat");

const app = express();

app.use(
  cors({
    origin: env.clientUrl,
    credentials: false,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "codebase-onboarding-assistant", env: env.nodeEnv });
});

app.use("/api/repos", reposRouter);
app.use("/api/chat", chatRouter);

// Generic error handler — last resort.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  logger.error(`Unhandled error on ${req.method} ${req.path}:`, err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
});

async function start() {
  try {
    await connectMongo();
  } catch (err) {
    logger.error("Aborting startup: MongoDB unreachable.", err.message);
    process.exit(1);
  }
  app.listen(env.port, () => {
    logger.info(`Server listening on http://localhost:${env.port}`);
    logger.info(`CORS allowed origin: ${env.clientUrl}`);
  });
}

start();
