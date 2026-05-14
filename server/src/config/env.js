const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function asInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: asInt(process.env.PORT, 5000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",

  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    // Override to point the OpenAI SDK at any OpenAI-compatible server
    // (Ollama: http://localhost:11434/v1, Groq: https://api.groq.com/openai/v1, …).
    // Leave unset for the real OpenAI API.
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    chatModel: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
    embedModel: process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small",
    // Vector dim emitted by the embedding model. Must match the Qdrant
    // collection size. text-embedding-3-small=1536, nomic-embed-text=768,
    // bge-large-en=1024, etc.
    embedDim: asInt(process.env.EMBED_DIM, 1536),
  },

  mongoUri:
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/codebase-onboarding",

  qdrant: {
    url: process.env.QDRANT_URL || "http://localhost:6333",
    apiKey: process.env.QDRANT_API_KEY || undefined,
  },

  githubToken: process.env.GITHUB_TOKEN || undefined,

  limits: {
    maxFiles: asInt(process.env.MAX_FILES_PER_REPO, 500),
    maxLines: asInt(process.env.MAX_LINES_PER_REPO, 100_000),
    maxFileSize: asInt(process.env.MAX_FILE_SIZE_BYTES, 200_000),
    embedBatchSize: asInt(process.env.EMBED_BATCH_SIZE, 64),
    cacheReindexHours: asInt(process.env.CACHE_REINDEX_HOURS, 24),
  },
};

module.exports = env;
