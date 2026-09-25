import { normalizeError } from '../errors/normalize-error.js';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const normalized = normalizeError(error);
  // Không serialize lỗi gốc vì có thể chứa SQL, mật khẩu hoặc token.
  const event = {
    event: 'request_failed',
    traceId: req.traceId,
    timestamp: new Date().toISOString(),
    method: req.method,
    status: normalized.status,
    code: normalized.code,
  };
  if (normalized.status >= 500) console.error(JSON.stringify(event));
  else console.warn(JSON.stringify(event));
  res.status(normalized.status).json({
    success: false,
    error: {
      code: normalized.code,
      message: normalized.message,
      details: normalized.details,
      traceId: req.traceId,
      timestamp: event.timestamp,
      path: req.path,
    },
  });
}
