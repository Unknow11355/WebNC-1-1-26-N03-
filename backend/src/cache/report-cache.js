const DEFAULT_TTL_MS = 30_000;
const MAX_ENTRIES = 256;
const cache = new Map();

function enabled() {
  return process.env.B9_REPORT_CACHE !== '0';
}

function ttlMs() {
  const value = Number(process.env.B9_REPORT_CACHE_TTL_MS ?? DEFAULT_TTL_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TTL_MS;
}

function trim() {
  while (cache.size > MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey === undefined) break;
    cache.delete(firstKey);
  }
}

export function getReportCache(key) {
  if (!enabled()) return null;
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function setReportCache(key, value) {
  if (!enabled()) return;
  cache.set(key, { value, expiresAt: Date.now() + ttlMs() });
  trim();
}

export function invalidateReportCache() {
  cache.clear();
}

export function clearReportCache() {
  cache.clear();
}

export function getReportCacheStats() {
  return { enabled: enabled(), size: cache.size, ttl_ms: ttlMs() };
}
