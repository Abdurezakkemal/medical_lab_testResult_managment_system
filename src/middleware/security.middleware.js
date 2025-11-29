const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "100", 10);

// In-memory rate limit store keyed by IP
const ipRequests = new Map();

const allowedOrigin = process.env.CORS_ORIGIN || "*";

module.exports = (req, res, next) => {
  // Security headers
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "DENY");
  res.header("X-XSS-Protection", "0");
  res.header("Referrer-Policy", "no-referrer");
  res.header("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.header(
    "Content-Security-Policy",
    "default-src 'self'; connect-src 'self' http://localhost:5173; frame-ancestors 'none'; object-src 'none'; base-uri 'self'"
  );

  // Handle preflight requests quickly
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  // Simple IP-based rate limiting
  const now = Date.now();
  const ip =
    req.ip ||
    req.headers["x-forwarded-for"] ||
    (req.connection && req.connection.remoteAddress) ||
    "unknown";

  let entry = ipRequests.get(ip);
  if (!entry || now - entry.startTime > RATE_LIMIT_WINDOW_MS) {
    entry = { startTime: now, count: 0 };
  }

  entry.count += 1;
  ipRequests.set(ip, entry);

  if (entry.count > RATE_LIMIT_MAX) {
    return res
      .status(429)
      .json({ message: "Too many requests, please try again later." });
  }

  next();
};
