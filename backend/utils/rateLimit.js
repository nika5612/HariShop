// Simple in-memory rate limiter for forgot password (production: use Redis)
const rateLimitMap = new Map();

export const checkRateLimit = (ip) => {
  const now = Date.now();
  const key = `forgot_${ip}`;
  const record = rateLimitMap.get(key) || { count: 0, resetTime: now + 60 * 60 * 1000 }; // 1 hour window

  if (now > record.resetTime) {
    rateLimitMap.delete(key);
    return true; // Reset
  }

  if (record.count >= 3) {
    return false; // Limit exceeded
  }

  record.count += 1;
  rateLimitMap.set(key, record);
  return true;
};

export default { checkRateLimit };
