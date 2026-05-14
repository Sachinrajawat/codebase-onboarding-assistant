const rateLimit = require("express-rate-limit");

// Two profiles:
//
//  analyzeLimiter — strict. Every analyze call is potentially expensive
//    (clone bandwidth + embedding tokens), so we cap to 5 per IP per hour.
//
//  chatLimiter — looser. Chat is bounded by max_tokens, so we allow more,
//    but still throttle to prevent burn-through.
//
// In production behind a load balancer, `app.set('trust proxy', 1)` so the
// limiter keys on the real client IP via X-Forwarded-For. Disabled here
// because for local dev the IP is just 127.0.0.1.

function jsonHandler(req, res /* , next */) {
  res.status(429).json({
    error: "Too many requests",
    message: "Rate limit exceeded. Please try again later.",
  });
}

const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});

module.exports = { analyzeLimiter, chatLimiter };
