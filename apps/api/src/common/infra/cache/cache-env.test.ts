import { describe, expect, it, vi } from 'vitest';
import { redisUrl } from './cache-env';
import { CacheGuard } from './cache-guard';
import { cacheStoreFromEnv } from './cache.module';

describe('REDIS_URL', () => {
  it('unset or blank = no Redis', () => {
    expect(redisUrl({})).toBeNull();
    expect(redisUrl({ REDIS_URL: '  ' })).toBeNull();
  });

  it('accepts redis:// and rediss://', () => {
    expect(redisUrl({ REDIS_URL: 'redis://ayat-redis:6379' })).toBe('redis://ayat-redis:6379');
    expect(redisUrl({ REDIS_URL: ' rediss://:pw@host:6380/1 ' })).toBe('rediss://:pw@host:6380/1');
  });

  it('refuses anything else without ever echoing the value (it may carry a password)', () => {
    const onBad = vi.fn();
    expect(redisUrl({ REDIS_URL: 'http://:s3cret@host' }, onBad)).toBeNull();
    expect(redisUrl({ REDIS_URL: 's3cret-not-a-url' }, onBad)).toBeNull();
    expect(onBad).toHaveBeenCalledTimes(2);
    expect(onBad.mock.calls.flat().join(' ')).not.toContain('s3cret');
  });

  it('no REDIS_URL (or a bad one) = the memory store, today\'s behaviour', () => {
    expect(cacheStoreFromEnv(new CacheGuard(), {}).mode).toBe('memory');
    expect(cacheStoreFromEnv(new CacheGuard(), { REDIS_URL: 'nope' }).mode).toBe('memory');
  });
});
