/**
 * REDIS_URL (bootstrap env only, docs/25 §5: never a database integration key): `redis://` or
 * `rediss://`, e.g. redis://ayat-redis:6379 on the compose network. Unset or blank = no Redis, every
 * cache stays in its own process exactly as before. A malformed value is refused (null, so the cache
 * stays in memory) and `onBad` gets a reason that never contains the value (it may carry a password).
 */
export function redisUrl(source: NodeJS.ProcessEnv = process.env, onBad: (reason: string) => void = () => undefined): string | null {
  const raw = (source.REDIS_URL ?? '').trim();
  if (raw === '') return null;
  try {
    const url = new URL(raw);
    if (url.protocol === 'redis:' || url.protocol === 'rediss:') return raw;
    onBad('REDIS_URL must start with redis:// or rediss://');
  } catch {
    onBad('REDIS_URL is not a valid URL');
  }
  return null;
}
