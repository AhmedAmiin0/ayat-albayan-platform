import { Global, Logger, Module } from '@nestjs/common';
import { redisUrl } from './cache-env';
import { CacheGuard } from './cache-guard';
import type { CacheStore } from './cache-store';
import { MemoryCacheStore } from './memory-cache.store';
import { RedisCacheStore } from './redis-cache.store';
import { connectRedis } from './redis-connect';
import { CACHE_STORE, SharedCache } from './shared-cache';

const log = new Logger('SharedCache');

/** Redis when REDIS_URL is set and valid, else this process's memory (today's behaviour). */
export function cacheStoreFromEnv(guard: CacheGuard, source: NodeJS.ProcessEnv = process.env): CacheStore {
  const url = redisUrl(source, (reason) => log.warn(`${reason}; the cache stays in memory`));
  if (!url) return new MemoryCacheStore();
  log.log('shared cache: redis');
  return new RedisCacheStore(connectRedis(url, (e) => guard.fail(e)));
}

/** Global: every reader may take SharedCache (optional, so unit tests without this module keep memory). */
@Global()
@Module({
  providers: [
    { provide: CacheGuard, useFactory: () => new CacheGuard() },
    { provide: CACHE_STORE, inject: [CacheGuard], useFactory: (guard: CacheGuard) => cacheStoreFromEnv(guard) },
    SharedCache,
  ],
  exports: [SharedCache],
})
export class CacheModule {}
