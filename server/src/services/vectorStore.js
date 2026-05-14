const { QdrantClient } = require("@qdrant/js-client-rest");
const { v4: uuidv4 } = require("uuid");

const env = require("../config/env");
const logger = require("../utils/logger");
const { EMBED_DIM } = require("./embedder");

let _client = null;
function client() {
  if (!_client) {
    _client = new QdrantClient({
      url: env.qdrant.url,
      apiKey: env.qdrant.apiKey,
      checkCompatibility: false,
    });
  }
  return _client;
}

// Each repo gets its own collection so we can drop it cleanly on re-index.
function collectionNameFor(repoUrl) {
  const safe = repoUrl
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "_")
    .toLowerCase()
    .slice(0, 60);
  return `repo_${safe}`;
}

async function ensureCollection(name) {
  const existing = await client().collectionExists(name);
  if (existing && existing.exists) {
    logger.debug(`Qdrant collection already exists: ${name}`);
    return;
  }
  await client().createCollection(name, {
    vectors: { size: EMBED_DIM, distance: "Cosine" },
  });
  // Payload indexes make filters fast.
  try {
    await client().createPayloadIndex(name, {
      field_name: "filePath",
      field_schema: "keyword",
    });
    await client().createPayloadIndex(name, {
      field_name: "name",
      field_schema: "keyword",
    });
    await client().createPayloadIndex(name, {
      field_name: "language",
      field_schema: "keyword",
    });
  } catch (err) {
    logger.warn(`Failed to create payload indexes on ${name}: ${err.message}`);
  }
  logger.info(`Created Qdrant collection: ${name}`);
}

async function dropCollection(name) {
  try {
    await client().deleteCollection(name);
    logger.info(`Dropped Qdrant collection: ${name}`);
  } catch (err) {
    logger.warn(`Failed to drop collection ${name}: ${err.message}`);
  }
}

// chunks: [{ content, metadata }], vectors: [[...]]
async function upsertChunks({ collectionName, chunks, vectors }) {
  if (chunks.length !== vectors.length) {
    throw new Error("Chunks and vectors length mismatch");
  }
  if (chunks.length === 0) return;

  const points = chunks.map((chunk, i) => ({
    id: uuidv4(),
    vector: vectors[i],
    payload: {
      content: chunk.content,
      ...chunk.metadata,
    },
  }));

  // Upsert in pages to keep request size reasonable.
  const PAGE = 128;
  for (let i = 0; i < points.length; i += PAGE) {
    const slice = points.slice(i, i + PAGE);
    await client().upsert(collectionName, { points: slice, wait: true });
  }
  logger.info(`Upserted ${points.length} chunks into ${collectionName}`);
}

// Hybrid search:
//  - vector search (top-K semantic hits)
//  - if `keyword` is provided, also fetch points whose `name` exactly matches
//  - merge & dedupe, keeping the best vector score
async function hybridSearch({ collectionName, vector, keyword, topK = 8 }) {
  const c = client();

  const vectorResults = await c.search(collectionName, {
    vector,
    limit: topK,
    with_payload: true,
  });

  let keywordResults = [];
  if (keyword) {
    try {
      const scrolled = await c.scroll(collectionName, {
        filter: {
          must: [
            { key: "name", match: { value: keyword } },
          ],
        },
        limit: 5,
        with_payload: true,
        with_vector: false,
      });
      // Exact name matches are very high-signal — score them above any
      // vector match so they aren't trimmed by the topK slice below.
      keywordResults = (scrolled.points || []).map((p) => ({
        id: p.id,
        score: 1.0,
        payload: p.payload,
      }));
    } catch (err) {
      logger.warn(`Keyword filter failed: ${err.message}`);
    }
  }

  // Merge: keyword hits first (so they win on duplicate IDs), then vector hits.
  const merged = new Map();
  for (const r of keywordResults) {
    merged.set(r.id, r);
  }
  for (const r of vectorResults) {
    if (!merged.has(r.id)) merged.set(r.id, r);
  }

  return Array.from(merged.values())
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, topK);
}

module.exports = {
  ensureCollection,
  dropCollection,
  upsertChunks,
  hybridSearch,
  collectionNameFor,
};
