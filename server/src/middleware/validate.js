const { z } = require("zod");
const mongoose = require("mongoose");

// ---------------------------------------------------------------------------
// Reusable primitives
// ---------------------------------------------------------------------------
const objectIdString = z
  .string()
  .refine((v) => mongoose.isValidObjectId(v), { message: "Invalid id" });

// We do a *light* sanity check on the URL here; the real parsing happens in
// services/github.js (which knows how to extract owner/name and handles
// trailing slashes, .git, /tree/main paths, etc.).
const repoUrlSchema = z
  .string()
  .trim()
  .min(1, "repoUrl is required")
  .max(500, "repoUrl is implausibly long")
  .url("repoUrl must be a URL")
  .refine((v) => /^https?:\/\/github\.com\//i.test(v), {
    message: "Only github.com URLs are accepted",
  });

// ---------------------------------------------------------------------------
// Route schemas
// ---------------------------------------------------------------------------
const analyzeBody = z
  .object({
    repoUrl: repoUrlSchema,
    force: z.boolean().optional(),
  })
  .strict();

const chatBody = z
  .object({
    repoId: objectIdString,
    sessionId: z.string().uuid().optional(),
    message: z
      .string()
      .trim()
      .min(1, "message is required")
      .max(2000, "message is too long"),
  })
  .strict();

// ---------------------------------------------------------------------------
// Express helper: validate `req.body` against a zod schema. On failure,
// returns 400 with a flat list of field errors. On success, replaces
// `req.body` with the parsed (and trimmed) value.
// ---------------------------------------------------------------------------
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      return res.status(400).json({ error: "Invalid request", details: errors });
    }
    req.body = result.data;
    next();
  };
}

// Validate `req.params[name]` is a Mongo ObjectId.
function validateObjectIdParam(name) {
  return (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params[name])) {
      return res.status(400).json({ error: `Invalid ${name}` });
    }
    next();
  };
}

module.exports = {
  validateBody,
  validateObjectIdParam,
  schemas: { analyzeBody, chatBody },
};
