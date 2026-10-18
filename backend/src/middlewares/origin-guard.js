import { AppError } from '../errors/app-error.js';

// Explicit browser-origin allowlist; never trust Host/X-Forwarded-Host as policy.
export function createOriginGuard(origins = []) {
  const allowed = new Set(origins);
  const safe = new Set(['GET', 'HEAD', 'OPTIONS']);
  return (req, res, next) => {
    const origin = req.get('origin');
    const method =
      req.method === 'OPTIONS'
        ? (req.get('access-control-request-method') || 'OPTIONS').toUpperCase()
        : req.method;
    if (safe.has(method)) return next();
    // CLI/server clients need no Origin but must still pass route authentication.
    if (origin === undefined && req.get('sec-fetch-site') !== 'cross-site') return next();
    if (origin && origin !== 'null' && allowed.has(origin)) return next();
    return next(new AppError(403, 'ORIGIN_FORBIDDEN', 'Nguồn yêu cầu không được phép'));
  };
}
