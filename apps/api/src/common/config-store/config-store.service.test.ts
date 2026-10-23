import { describe, expect, it, vi } from 'vitest';
import { configRow } from './config-store.fakes';
import type { ConfigStoreQueries } from './config-store.queries';
import { ConfigStore } from './config-store.service';
import type { ConfigSnapshot } from './config-store.types';

function store(opts: { ttl?: number; refresh?: () => Promise<unknown> } = {}) {
  let snap: ConfigSnapshot = { rev: 1, rows: [configRow('upload_max_mb', 4)] };
  let rev = 1;
  const q = {
    snapshot: vi.fn(async () => snap),
    revision: vi.fn(async () => rev),
    set: vi.fn(async () => undefined),
    describe: vi.fn(async () => undefined),
    names: vi.fn(async () => new Map<string, string>()),
  };
  const s = new ConfigStore(q as unknown as ConfigStoreQueries, opts.ttl ?? 30_000, opts.refresh);
  const write = (value: unknown, newRev: number) => {
    snap = { rev: newRev, rows: [configRow('upload_max_mb', value)] };
    rev = newRev;
  };
  return { s, q, write };
}

describe('ConfigStore cache and revision freshness (docs/26 §2c)', () => {
  it('within 2 s the cached rows are used with no query', async () => {
    const { s, q } = store();
    await s.snapshot(0);
    await s.snapshot(1_999);
    expect(q.snapshot).toHaveBeenCalledTimes(1);
    expect(q.revision).not.toHaveBeenCalled();
  });

  it('after 2 s one revision query; same rev → the cache stays', async () => {
    const { s, q } = store();
    await s.snapshot(0);
    expect(await s.effective('upload_max_mb', 2_000)).toBe(4);
    expect(q.revision).toHaveBeenCalledTimes(1);
    expect(q.snapshot).toHaveBeenCalledTimes(1);
  });

  it('a raw SQL write (rev differs) is seen at the next check, not before', async () => {
    const { s, q, write } = store();
    await s.snapshot(0);
    write(9, 2);
    expect(await s.effective('upload_max_mb', 1_000)).toBe(4);
    expect(await s.effective('upload_max_mb', 2_500)).toBe(9);
    expect(q.snapshot).toHaveBeenCalledTimes(2);
    await s.snapshot(3_000);
    expect(q.revision).toHaveBeenCalledTimes(1);
  });

  it('the TTL reloads the rows; TTL 0 (e2e) reads every time', async () => {
    const a = store({ ttl: 30_000 });
    await a.s.snapshot(0);
    await a.s.snapshot(30_000);
    expect(a.q.snapshot).toHaveBeenCalledTimes(2);
    const b = store({ ttl: 0 });
    await b.s.snapshot(0);
    await b.s.snapshot(0);
    expect(b.q.snapshot).toHaveBeenCalledTimes(2);
  });

  it('a failed read rejects and is not cached; a failed revision check is not cached either', async () => {
    const { s, q } = store();
    q.snapshot.mockRejectedValueOnce(new Error('down'));
    await expect(s.snapshot(0)).rejects.toThrow('down');
    expect((await s.snapshot(1)).rows).toHaveLength(1);
    q.revision.mockRejectedValueOnce(new Error('rev down'));
    await expect(s.snapshot(5_000)).rejects.toThrow('rev down');
    await s.snapshot(5_001);
    expect(q.snapshot).toHaveBeenCalledTimes(3);
  });

  it('own writes invalidate at once (also on a failed write) and tell the listeners', async () => {
    const { s, q } = store();
    const listener = vi.fn();
    s.onChange(listener);
    await s.snapshot(0);
    await s.set([{ key: 'upload_max_mb', value: 8, expectedVersion: 1 }], 'u1');
    q.set.mockRejectedValueOnce(new Error('x'));
    await expect(s.set([], 'u1')).rejects.toThrow('x');
    await s.snapshot(1);
    expect(q.snapshot).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('ConfigStore values and descriptions', () => {
  it('allEffective decodes every key; a malformed row reads as its default and is logged once', async () => {
    const { s, q } = store();
    q.snapshot.mockResolvedValue({ rev: 1, rows: [configRow('upload_max_mb', 'four'), configRow('messaging_enabled', 'true')] });
    const warn = vi.spyOn(Reflect.get(s, 'log') as { warn: (m: string) => void }, 'warn').mockImplementation(() => undefined);
    const all = await s.allEffective(0);
    await s.allEffective(0);
    expect(all).toMatchObject({ upload_max_mb: 10, messaging_enabled: false, google_sync_mode: 'dry_run' });
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('effective rejects an unknown key', async () => {
    await expect(store().s.effective('nope')).rejects.toThrow('unknown config key');
  });

  it('describe sends the entry hint key, invalidates and reloads the translation overrides', async () => {
    const refresh = vi.fn(async () => true);
    const { s, q } = store({ refresh });
    await s.describe({ key: 'upload_max_mb', text: 'وصف', actorId: 'u1' });
    expect(q.describe).toHaveBeenCalledWith({ key: 'upload_max_mb', text: 'وصف', actorId: 'u1', hintKey: 'settings.hints.uploadMaxMb' });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('a failed overrides reload never fails the description save', async () => {
    const { s } = store({ refresh: vi.fn(async () => Promise.reject(new Error('x'))) });
    await expect(s.describe({ key: 'upload_max_mb', text: null, actorId: 'u1' })).resolves.toBeUndefined();
  });
});
