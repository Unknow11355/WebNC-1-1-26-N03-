export const SESSION_COOKIE = 'webnc_session';

export function readSessionCookie(req) {
  const matches = (req.get('cookie') || '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (matches.length !== 1) return null;
  try {
    return decodeURIComponent(matches[0].slice(SESSION_COOKIE.length + 1));
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  // HTTPS termination happens at Codespaces; do not trust client forwarded headers.
  const secure =
    Boolean(process.env.CODESPACE_NAME) ||
    process.env.NODE_ENV === 'production' ||
    process.env.SESSION_COOKIE_SECURE === 'true';
  return { httpOnly: true, secure, sameSite: 'lax', path: '/api/v1' };
}

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, { ...sessionCookieOptions(), maxAge: 3600000 });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
}
