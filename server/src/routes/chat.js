const express = require("express");
const { v4: uuidv4, validate: uuidValidate } = require("uuid");

const Repo = require("../models/Repo");
const ChatSession = require("../models/ChatSession");

const embedder = require("../services/embedder");
const vectorStore = require("../services/vectorStore");
const llm = require("../services/llm");
const github = require("../services/github");
const logger = require("../utils/logger");
const {
  validateBody,
  validateObjectIdParam,
  schemas,
} = require("../middleware/validate");
const { chatLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// Cap how many past messages we keep in a session document. Beyond this we
// drop the oldest, so the document size stays bounded and prompt context
// stays fast to load. The LLM is already bounded to the last 6 turns by
// llm.js — this cap protects MongoDB document size.
const MAX_STORED_MESSAGES = 50;

// Internal error messages we trust to surface to the user. Anything else is
// logged server-side and replaced with a generic message.
function isSafeUserError(err) {
  if (!err || !err.message) return false;
  const m = err.message;
  return (
    m === "Repo not found" ||
    m.startsWith("Repo is not ready") ||
    m.startsWith("OPENAI_API_KEY is not set")
  );
}

// Pull "exact name" candidates out of a question for the keyword side of
// hybrid search. A candidate must look like a code identifier — not just a
// capitalized English word like "How" or "Where" — so we require a transition
// (camelCase, snake_case, or PascalCase with >=2 capitals).
const STOP_WORDS = new Set([
  "How", "What", "Where", "When", "Why", "Who", "Which", "Is", "Does",
  "Do", "Can", "Could", "Should", "Would", "Will", "The", "This", "That",
]);

function extractKeywordCandidate(question) {
  // 1. Anything inside backticks wins — user explicitly marked it.
  const tick = question.match(/`([^`]+)`/);
  if (tick) return tick[1];

  // 2. Collect all identifier-looking tokens (transitions only).
  const candidates = [];
  // camelCase: lowercase-then-uppercase, e.g. parseAsync, getUserData
  for (const m of question.matchAll(/\b[a-z][a-z0-9]*[A-Z][a-zA-Z0-9]*\b/g)) {
    candidates.push(m[0]);
  }
  // snake_case: must contain an underscore
  for (const m of question.matchAll(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g)) {
    candidates.push(m[0]);
  }
  // PascalCase: two or more capitals, e.g. MyClass, HTTPServer (skip stop words)
  for (const m of question.matchAll(/\b[A-Z][a-z0-9]*[A-Z][a-zA-Z0-9]*\b/g)) {
    if (!STOP_WORDS.has(m[0])) candidates.push(m[0]);
  }

  return candidates[0] || null;
}

function buildCitations({ repo, results }) {
  return results.map((r) => {
    const p = r.payload || {};
    return {
      filePath: p.filePath,
      startLine: p.startLine,
      endLine: p.endLine,
      score: r.score,
      type: p.type,
      name: p.name,
      language: p.language,
      url: github.buildGithubFileUrl({
        owner: repo.owner,
        name: repo.name,
        branch: repo.defaultBranch || "main",
        filePath: p.filePath,
        startLine: p.startLine,
        endLine: p.endLine,
      }),
    };
  });
}

// POST /api/chat
// Body: { repoId, sessionId?, message }
// Streams Server-Sent Events:
//   event: meta        -> { sessionId, citations }
//   event: token       -> { delta }
//   event: done        -> { fullText }
//   event: error       -> { error }
router.post("/", chatLimiter, validateBody(schemas.chatBody), async (req, res) => {
  const { repoId, message } = req.body;
  let { sessionId } = req.body;

  // SSE headers.
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable proxy buffering
  res.flushHeaders?.();

  function sse(event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    const repo = await Repo.findById(repoId);
    if (!repo) throw new Error("Repo not found");
    if (repo.status !== "ready") {
      throw new Error(`Repo is not ready (status: ${repo.status})`);
    }

    // Embed the question.
    const qVector = await embedder.embedSingle(message);

    // Hybrid search.
    const keyword = extractKeywordCandidate(message);
    const results = await vectorStore.hybridSearch({
      collectionName: repo.collectionName,
      vector: qVector,
      keyword,
      topK: 8,
    });

    const citations = buildCitations({ repo, results });

    // Load or create the chat session. We don't trust caller-supplied
    // sessionIds — if it's not a valid UUID or doesn't already exist, we
    // mint a new one. This also prevents a caller from hijacking another
    // user's session by guessing IDs.
    if (!sessionId || !uuidValidate(sessionId)) sessionId = uuidv4();
    let session = await ChatSession.findOne({ sessionId });
    if (!session) {
      session = await ChatSession.create({
        sessionId,
        repoId: repo._id,
        messages: [],
      });
    }
    const history = session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Emit the metadata frame so the UI can render citations next to the
    // streaming answer immediately.
    sse("meta", { sessionId, citations });

    let fullText = "";
    await llm.streamChat({
      chunks: results,
      history,
      userQuestion: message,
      onToken: (delta) => {
        fullText += delta;
        sse("token", { delta });
      },
    });

    // Persist the turn. Use a single $push with $each + $slice so the
    // document never grows beyond MAX_STORED_MESSAGES even on long sessions.
    await ChatSession.updateOne(
      { sessionId },
      {
        $push: {
          messages: {
            $each: [
              { role: "user", content: message },
              {
                role: "assistant",
                content: fullText,
                citations: citations.map((c) => ({
                  filePath: c.filePath,
                  startLine: c.startLine,
                  endLine: c.endLine,
                  score: c.score,
                })),
              },
            ],
            $slice: -MAX_STORED_MESSAGES,
          },
        },
      }
    );

    sse("done", { fullText });
    res.end();
  } catch (err) {
    logger.error(`/api/chat failed: ${err.stack || err.message}`);
    const userMessage = isSafeUserError(err) ? err.message : "Chat request failed.";
    try {
      sse("error", { error: userMessage });
    } catch {
      // Headers may already have been sent; nothing to do.
    }
    res.end();
  }
});

// GET /api/chat/session/:sessionId — fetch a session's message history
router.get("/session/:sessionId", async (req, res) => {
  if (!uuidValidate(req.params.sessionId)) {
    return res.status(400).json({ error: "Invalid sessionId" });
  }
  try {
    const session = await ChatSession.findOne({ sessionId: req.params.sessionId }).lean();
    if (!session) return res.status(404).json({ error: "Session not found" });
    return res.json({ session });
  } catch (err) {
    logger.error(`GET /chat/session failed: ${err.stack || err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
module.exports.extractKeywordCandidate = extractKeywordCandidate;
