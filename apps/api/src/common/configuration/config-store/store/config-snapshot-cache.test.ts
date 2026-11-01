import { describe, expect, it, vi } from 'vitest';
import { configRow } from '@/common/configuration/config-store/config-store.fakes';
import { SnapshotCache } from './config-snapshot-cache';

function source(rev = 1) {
  const state = { rev, snap: { rev, rows: [configRow('upload_max_mb', 4)] } };
  const src = {
    snapshot: vi.fn(async () => state.snap),
    revision: vi.fn(async () => state.rev),
  };
  return { src, state };
}

describe('SnapshotCache (docs/26 §2c)', () => {
  it('reuses the rows within the revision window and the TTL', async () => {
    const { src } = source();
    const cache = new SnapshotCache(src, 30_000);
    const a = await cache.read(0);
    expect(await cache.read(1_999)).toBe(a);
    expect(src.snapshot).toHaveBeenCalledTimes(1);
    expect(src.revision).not.toHaveBeenCalled();
  });

  it('rechecks the revision after 2 s and reloads only when it moved', async () => {
    const { src, state } = source();
    const cache = new SnapshotCache(src, 30_000);
    await cache.read(0);
    await cache.read(2_000);
    expect(src.snapshot).toHaveBeenCalledTimes(1);
    state.rev = 2;
    state.snap = { rev: 2, rows: [configRow('upload_max_mb', 9)] };
    expect((await cache.read(4_000)).rev).toBe(2);
    expect(src.revision).toHaveBeenCalledTimes(2);
    expect(src.snapshot).toHaveBeenCalledTimes(2);
  });

  it('reloads after the TTL and after drop()', async () => {
    const { src } = source();
    const cache = new SnapshotCache(src, 10_000);
    await cache.read(0);
    await cache.read(10_000);
    cache.drop();
    await cache.read(10_001);
    expect(src.snapshot).toHaveBeenCalledTimes(3);
  });

  it('never caches a failed read', async () => {
    const { src } = source();
    src.snapshot.mockRejectedValueOnce(new Error('down'));
    const cache = new SnapshotCache(src, 30_000);
    await expect(cache.read(0)).rejects.toThrow('down');
    await expect(cache.read(1)).resolves.toMatchObject({ rev: 1 });
    expect(src.snapshot).toHaveBeenCalledTimes(2);
  });
});
