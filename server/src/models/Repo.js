const mongoose = require("mongoose");

// One document per analyzed GitHub repo. The repoUrl is normalized
// (lowercased, .git stripped, trailing slash removed) so cache hits are
// reliable across cosmetic variations.
const RepoSchema = new mongoose.Schema(
  {
    repoUrl: { type: String, required: true, unique: true, index: true },
    owner: { type: String, required: true },
    name: { type: String, required: true },
    defaultBranch: { type: String, default: "main" },
    commitSha: { type: String },

    // Qdrant collection name we wrote vectors to.
    collectionName: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "indexing", "ready", "failed"],
      default: "pending",
      index: true,
    },
    error: { type: String },

    stats: {
      files: { type: Number, default: 0 },
      lines: { type: Number, default: 0 },
      chunks: { type: Number, default: 0 },
      embedTokens: { type: Number, default: 0 },
      languages: { type: Map, of: Number, default: {} },
    },

    architectureSummary: { type: String, default: "" },
    lastIndexedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Repo", RepoSchema);
