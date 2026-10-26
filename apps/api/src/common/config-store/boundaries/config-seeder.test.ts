import { REGISTRY_VERSION, SEED_ENTRIES } from '@ab/shared';
import arBundle from '@ab/shared/i18n/ar.json';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../../db/db.module';
import { ConfigSeeder, runConfigSeed, SEED_DELAY_MS } from './config-seeder';
import type { ConfigStore } from '../store/config-store.service';

const log = () => ({ log: vi.fn(), warn: vi.fn(), error: vi.fn() });

function dbAnswering(answer: { data?: unknown; error?: { message: string } | null } | Error) {
  const rpc = vi.fn(async () => {
    if (answer instanceof Error) throw answer;
    return { data: answer.data ?? null, error: answer.error ?? null };
  });
  return { db: { rpc } as unknown as Db, rpc };
}

type Entry = Record<string, unknown>;
const sentEntries = (rpc: ReturnType<typeof vi.fn>): Entry[] => {
  const args = rpc.mock.calls[0]?.[1] as { entries: Entry[]; registry_version: number };
  return args.entries;
};

describe('runConfigSeed', () => {
  it('sends every SEED_ENTRIES key with REGISTRY_VERSION and NO value field', async () => {
    const { db, rpc } = dbAnswering({ data: { applied: 3, failed: [] } });
    await runConfigSeed(db, log());
    expect(rpc).toHaveBeenCalledWith('config_seed', expect.objectContaining({ registry_version: REGISTRY_VERSION }));
    const entries = sentEntries(rpc);
    expect(entries.map((e) => e['key'])).toEqual(SEED_ENTRIES.map((e) => e.key));
    for (const e of entries) {
      expect(e).not.toHaveProperty('value');
      expect(Object.keys(e).sort()).toEqual(['default_value', 'description_seed', 'is_public', 'key', 'module', 'retired', 'scope', 'value_type']);
    }
  });

  it('description_seed is the BUNDLED Arabic hint (not an override)', async () => {
    const { db, rpc } = dbAnswering({ data: { applied: 0, failed: [] } });
    await runConfigSeed(db, log());
    const upload = sentEntries(rpc).find((e) => e['key'] === 'upload_max_mb');
    expect(upload?.['description_seed']).toBe(arBundle.settings.hints.uploadMaxMb.trim());
  });

  it('logs applied / failed, and an older-build or locked skip', async () => {
    const l1 = log();
    expect(await runConfigSeed(dbAnswering({ data: { applied: 2, failed: ['bad'] } }).db, l1)).toEqual({ applied: 2, failed: ['bad'] });
    expect(l1.warn).toHaveBeenCalledWith(expect.stringContaining('failed: bad'));
    const l2 = log();
    await runConfigSeed(dbAnswering({ data: { skipped: 'older_build', stored: 7 } }).db, l2);
    expect(l2.log).toHaveBeenCalledWith('config seed skipped: older_build (stored registry 7)');
    const l3 = log();
    await runConfigSeed(dbAnswering({ data: { skipped: 'locked' } }).db, l3);
    expect(l3.log).toHaveBeenCalledWith('config seed skipped: locked');
  });

  it('never throws: an RPC error or a thrown call is logged and answered null', async () => {
    const l1 = log();
    expect(await runConfigSeed(dbAnswering({ error: { message: 'permission denied' } }).db, l1)).toBeNull();
    expect(l1.error).toHaveBeenCalledWith('config seed failed: permission denied');
    const l2 = log();
    expect(await runConfigSeed(dbAnswering(new Error('fetch failed')).db, l2)).toBeNull();
    expect(l2.error).toHaveBeenCalledWith('config seed failed: fetch failed');
  });
});

describe('ConfigSeeder (boot)', () => {
  afterEach(() => vi.useRealTimers());

  it('boot does no work at once; the seed runs shortly after and never blocks it', async () => {
    vi.useFakeTimers();
    const { db, rpc } = dbAnswering(new Error('db down'));
    const store = { invalidate: vi.fn() } as unknown as ConfigStore;
    const seeder = new ConfigSeeder(db, store);
    expect(seeder.onApplicationBootstrap()).toBeUndefined();
    expect(rpc).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(SEED_DELAY_MS);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(store.invalidate).not.toHaveBeenCalled();
  });

  it('a close before the delay cancels the run; applied rows drop the store cache', async () => {
    vi.useFakeTimers();
    const a = dbAnswering({ data: { applied: 1, failed: [] } });
    const seeder = new ConfigSeeder(a.db, { invalidate: vi.fn() } as unknown as ConfigStore);
    seeder.onApplicationBootstrap();
    seeder.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(SEED_DELAY_MS * 2);
    expect(a.rpc).not.toHaveBeenCalled();
    const store = { invalidate: vi.fn() } as unknown as ConfigStore;
    await new ConfigSeeder(a.db, store).run();
    expect(store.invalidate).toHaveBeenCalledTimes(1);
  });
});
