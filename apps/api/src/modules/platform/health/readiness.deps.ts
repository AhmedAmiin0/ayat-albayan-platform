import type { CheckState } from '@ab/shared';
import type { CacheStore } from '@/common/infra/cache/cache-store';
import type { BeatReader } from '@/common/jobs/beats';
import type { ReadinessRepo } from './readiness.repo';
import type { ReadinessDeps } from './readiness.service';

/** Short: a deploy gate or a monitor wants a quick answer, and a slow database is not ready. */
export const READY_DB_TIMEOUT_MS = 2_000;

/** Redis is only a cache: not configured = off, unreachable = degraded (never down). */
export function redisState(store: Pick<CacheStore, 'mode' | 'ready'>): CheckState {
  if (store.mode === 'memory') return 'off';
  return store.ready() ? 'ok' : 'degraded';
}

interface Sources {
  repo: ReadinessRepo;
  store: Pick<CacheStore, 'mode' | 'ready'>;
  reader: BeatReader;
}

export function readinessDeps({ repo, store, reader }: Sources): ReadinessDeps {
  return {
    ping: () => repo.ping(READY_DB_TIMEOUT_MS),
    redis: () => redisState(store),
    beats: () => reader.read(),
    now: Date.now,
  };
}
