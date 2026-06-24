const buckets = new Map();

const rateLimit = ({
  windowMs = 60 * 1000,
  max = 60,
  keyPrefix = "global",
  message = "Too many requests. Please try again later.",
} = {}) => {
  return (req, res, next) => {
    const now = Date.now();
    const identity = req.user?._id?.toString() || req.ip || "unknown";
    const key = `${keyPrefix}:${identity}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds);
      return res.status(429).json({ message });
    }

    return next();
  };
};

module.exports = rateLimit;
