const express = require("express");
const cors = require("cors");

const env = require("./config/env");
const { connectMongo } = require("./config/db");
const logger = require("./utils/logger");

const reposRouter = require("./routes/repos");
const chatRouter = require("./routes/chat");

const app = express();

// Behind a load balancer / reverse proxy in production (Render, Fly, etc.)
// the client IP arrives in X-Forwarded-For. Trust exactly one hop so
// express-rate-limit keys on the real client IP rather than the LB's,
// which would otherwise treat every visitor as the same caller and either
// rate-limit them all together or refuse to start at all.
if (env.nodeEnv === "production") {
  app.set("trust proxy", 1);
}

// CORS: accept any origin in the comma-separated CLIENT_URL list.
// Wildcards in CLIENT_URL entries are translated to regexes so deployment
// preview domains like https://app-git-foo-bar.vercel.app match a
// pattern like https://app-git-*.vercel.app.
function compileOriginPatterns(list) {
  return list.map((entry) => {
    if (entry.includes("*")) {
      const pattern = "^" + entry.split("*").map(escapeRegex).join(".*") + "$";
      return new RegExp(pattern);
    }
    return entry;
  });
}
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const allowedOrigins = compileOriginPatterns(env.clientUrls);

app.use(
  cors({
    origin(origin, cb) {
      // Same-origin / curl / server-to-server requests have no Origin header.
      if (!origin) return cb(null, true);
      const ok = allowedOrigins.some((p) =>
        p instanceof RegExp ? p.test(origin) : p === origin
      );
      return ok ? cb(null, true) : cb(new Error(`CORS: ${origin} not allowed`));
    },
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
    logger.info(`CORS allowed origins: ${env.clientUrls.join(", ")}`);
  });
}

start();
