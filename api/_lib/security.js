const buckets = new Map();
const MAX_BODY_BYTES = 32 * 1024;

export function clientKey(req, scope = 'global') {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || req.socket?.remoteAddress || 'unknown';
  return `${scope}:${ip}`;
}

export function assertRateLimit(req, { scope, limit = 20, windowMs = 60_000 } = {}) {
  const key = clientKey(req, scope);
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  current.count += 1;

  if (current.count > limit) {
    const error = new Error('Too many requests. Try again later.');
    error.statusCode = 429;
    throw error;
  }
}

export function assertBodySize(req) {
  const length = Number(req.headers['content-length'] || 0);
  if (length > MAX_BODY_BYTES) {
    const error = new Error('Request body is too large.');
    error.statusCode = 413;
    throw error;
  }
}

export function validateStrongPassword(password) {
  const value = String(password || '');
  return (
    value.length >= 10 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

export function genericAuthMessage() {
  return 'Invalid login credentials.';
}
