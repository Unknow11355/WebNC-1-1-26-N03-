import { createHash } from 'node:crypto';
import { AppError } from '../errors/app-error.js';

// Single-process limiter. Use a shared atomic store before scaling to multiple workers.
export function createLoginLimiter({ now = Date.now, onLimited = async () => {} } = {}) {
  const entries = new Map();
  const windowMs = 15 * 60 * 1000;
  return {
    async run(email, work, requestId) {
      const time = now();
      for (const [key, attempts] of entries) {
        const active = attempts.filter((a) => time - a.time < windowMs || a.pending);
        if (active.length) entries.set(key, active);
        else entries.delete(key);
      }
      const key = createHash('sha256').update(email).digest('hex');
      const attempts = entries.get(key) || [];
      if (attempts.length >= 5 || (!entries.has(key) && entries.size >= 10000)) {
        await onLimited(requestId);
        throw new AppError(
          429,
          'RATE_LIMITED',
          'Đăng nhập sai quá nhiều, vui lòng thử lại sau 15 phút',
        );
      }
      // Reserve synchronously so concurrent requests cannot bypass the threshold.
      const attempt = { time, pending: true };
      attempts.push(attempt);
      entries.set(key, attempts);
      let retain = false;
      try {
        return await work();
      } catch (error) {
        retain = [401, 423].includes(error?.status);
        throw error;
      } finally {
        attempt.pending = false;
        if (!retain) {
          const current = entries.get(key);
          if (current) {
            const remaining = current.filter((a) => a !== attempt);
            if (remaining.length) entries.set(key, remaining);
            else entries.delete(key);
          }
        }
      }
    },
  };
}
