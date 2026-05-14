const mongoose = require("mongoose");

const CitationSchema = new mongoose.Schema(
  {
    filePath: String,
    startLine: Number,
    endLine: Number,
    score: Number,
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, required: true },
    citations: { type: [CitationSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ChatSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    repoId: { type: mongoose.Schema.Types.ObjectId, ref: "Repo", required: true, index: true },
    messages: { type: [MessageSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatSession", ChatSessionSchema);
