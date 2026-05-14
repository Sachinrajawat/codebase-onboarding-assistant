const express = require("express");
const Repo = require("../models/Repo");
const indexer = require("../services/indexer");
const logger = require("../utils/logger");

const router = express.Router();

// POST /api/repos/analyze
// Body: { repoUrl, force? }
// Synchronously indexes the repo (MVP). For very large repos, replace this
// with a background job + polling endpoint.
router.post("/analyze", async (req, res) => {
  const { repoUrl, force } = req.body || {};
  if (!repoUrl) {
    return res.status(400).json({ error: "repoUrl is required" });
  }
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
    logger.error(`analyze failed for ${repoUrl}: ${err.message}`);
    return res.status(400).json({ error: err.message });
  }
});

// GET /api/repos/:id — fetch the current state (status, summary, stats)
router.get("/:id", async (req, res) => {
  try {
    const repo = await Repo.findById(req.params.id).lean();
    if (!repo) return res.status(404).json({ error: "Repo not found" });
    return res.json({ repo });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
