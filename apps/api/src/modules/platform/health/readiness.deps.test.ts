import { describe, expect, it, vi } from 'vitest';
import type { BeatReader } from '@/common/jobs/beats';
import type { CacheStore } from '@/common/infra/cache/cache-store';
import { READY_DB_TIMEOUT_MS, readinessDeps, redisState } from './readiness.deps';
import type { ReadinessRepo } from './readiness.repo';

const store = (mode: CacheStore['mode'], ready: boolean) => ({ mode, ready: () => ready });

describe('readiness inputs', () => {
  it('Redis: off without REDIS_URL, ok when connected, degraded when not', () => {
    expect(redisState(store('memory', true))).toBe('off');
    expect(redisState(store('redis', true))).toBe('ok');
    expect(redisState(store('redis', false))).toBe('degraded');
  });

  it('the ping carries the short timeout; beats come from the reader; the clock is the server’s', async () => {
    const repo = { ping: vi.fn(async () => undefined) } as unknown as ReadinessRepo;
    const reader = { read: vi.fn(async () => null) } as unknown as BeatReader;
    const deps = readinessDeps({ repo, store: store('redis', true), reader });
    await deps.ping();
    expect(repo.ping).toHaveBeenCalledWith(READY_DB_TIMEOUT_MS);
    expect(await deps.beats()).toBeNull();
    expect(deps.redis()).toBe('ok');
    expect(Math.abs(deps.now() - Date.now())).toBeLessThan(1_000);
  });
});
