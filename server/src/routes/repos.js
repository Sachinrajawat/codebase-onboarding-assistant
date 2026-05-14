const express = require("express");
const Repo = require("../models/Repo");
const indexer = require("../services/indexer");
const logger = require("../utils/logger");
const {
  validateBody,
  validateObjectIdParam,
  schemas,
} = require("../middleware/validate");
const { analyzeLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// User-facing error messages we trust to surface as-is. Anything else is
// returned as a generic message; the full error is logged server-side.
function isSafeUserError(err) {
  if (!err || !err.message) return false;
  const m = err.message;
  return (
    m.startsWith("Only public GitHub repo URLs") ||
    m.startsWith("Only github.com URLs") ||
    m.includes("Repository not found") ||
    m.includes("Repository is too large") ||
    m.includes("Repo is too large") ||
    m.includes("Private repos are not supported") ||
    m.includes("No supported source files") ||
    m.includes("GitHub rate limit hit") ||
    m.includes("OPENAI_API_KEY is not set")
  );
}

// POST /api/repos/analyze
router.post(
  "/analyze",
  analyzeLimiter,
  validateBody(schemas.analyzeBody),
  async (req, res) => {
    const { repoUrl, force } = req.body;
    try {
      const repo = await indexer.indexRepo({ repoUrl, force: !!force });
      return res.json({
        repo: {
          id: repo._id,
          repoUrl: repo.repoUrl,
          owner: repo.owner,
          name: repo.name,
          defaultBranch: repo.defaultBranch,
          status: repo.status,
          stats: repo.stats,
          architectureSummary: repo.architectureSummary,
          lastIndexedAt: repo.lastIndexedAt,
        },
      });
    } catch (err) {
      logger.error(
        `analyze failed for ${repoUrl}:\n${logger.formatError(err)}`
      );
      const message = isSafeUserError(err)
        ? err.message
        : "Failed to analyze repository.";
      return res.status(400).json({ error: message });
    }
  }
);

// GET /api/repos/:id
router.get("/:id", validateObjectIdParam("id"), async (req, res) => {
  try {
    const repo = await Repo.findById(req.params.id).lean();
    if (!repo) return res.status(404).json({ error: "Repo not found" });
    return res.json({ repo });
  } catch (err) {
    logger.error(`GET /repos/:id failed: ${err.stack || err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
