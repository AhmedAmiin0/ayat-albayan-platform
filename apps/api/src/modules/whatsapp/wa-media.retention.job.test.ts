import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../common/storage/storage.service';
import type { CachedMedia, InboundMediaQueries } from './inbound-media.queries';
import { BATCH, MAX_BATCHES, WaMediaRetentionJob } from './wa-media.retention.job';

const NOW = new Date('2026-10-19T03:00:00Z');
const cached = (n: number, mime = 'audio/ogg; codecs=opus'): CachedMedia => ({ id: `m${n}`, media_path: `m${n}.ogg`, media_mime: mime });
const batch = (size: number, from = 0) => Array.from({ length: size }, (_, i) => cached(from + i));

function setup(...pages: CachedMedia[][]) {
  const queries = {
    cachedBefore: vi.fn(async () => pages.shift() ?? []),
    clearPaths: vi.fn().mockResolvedValue(undefined),
  };
  const storage = { removeMany: vi.fn().mockResolvedValue(undefined) };
  const job = new WaMediaRetentionJob(queries as unknown as InboundMediaQueries, storage as unknown as StorageService);
  return { job, queries, storage };
}

describe('WaMediaRetentionJob (inbound audio / video, 30 days)', () => {
  afterEach(() => vi.useRealTimers());

  it('removes an old cached voice note from wa-media, then clears its path', async () => {
    const { job, queries, storage } = setup([cached(1), cached(2, 'video/mp4')]);
    expect(await job.runOnce(NOW)).toBe(2);
    expect(queries.cachedBefore).toHaveBeenCalledWith({ before: '2026-09-19T03:00:00.000Z', limit: 100 });
    expect(storage.removeMany).toHaveBeenCalledWith({ bucket: 'wa-media', paths: ['m1.ogg', 'm2.ogg'] });
    expect(queries.clearPaths).toHaveBeenCalledWith(['m1', 'm2']);
    expect(storage.removeMany.mock.invocationCallOrder[0]).toBeLessThan(queries.clearPaths.mock.invocationCallOrder[0] ?? 0);
  });

  it('never removes a cached photo or PDF, even if the query returned one', async () => {
    const { job, queries, storage } = setup([cached(1, 'image/jpeg'), cached(2, 'application/pdf'), cached(3)]);
    expect(await job.runOnce(NOW)).toBe(1);
    expect(storage.removeMany).toHaveBeenCalledWith({ bucket: 'wa-media', paths: ['m3.ogg'] });
    expect(queries.clearPaths).toHaveBeenCalledWith(['m3']);
  });

  it('only photos / PDFs → nothing removed or cleared', async () => {
    const { job, queries, storage } = setup([cached(1, 'image/png')]);
    expect(await job.runOnce(NOW)).toBe(0);
    expect([storage.removeMany, queries.clearPaths].map((f) => f.mock.calls.length)).toEqual([0, 0]);
  });

  it('a removeMany failure leaves media_path in place for the next day, and does not throw', async () => {
    const { job, queries, storage } = setup([cached(1)]);
    storage.removeMany.mockRejectedValueOnce(new Error('storage down'));
    expect(await job.runOnce(NOW)).toBe(0);
    expect(queries.clearPaths).not.toHaveBeenCalled();
  });

  it('an empty run makes no update', async () => {
    const { job, queries, storage } = setup();
    expect(await job.runOnce(NOW)).toBe(0);
    expect([storage.removeMany, queries.clearPaths].map((f) => f.mock.calls.length)).toEqual([0, 0]);
  });

  it('loops full batches until a short or empty one', async () => {
    const { job, queries } = setup(batch(BATCH), batch(BATCH, BATCH), batch(3, 2 * BATCH));
    expect(await job.runOnce(NOW)).toBe(2 * BATCH + 3);
    expect(queries.cachedBefore).toHaveBeenCalledTimes(3);
  });

  it('stops at the cap of batches per run', async () => {
    const { job, queries } = setup();
    queries.cachedBefore.mockImplementation(async () => batch(BATCH));
    expect(await job.runOnce(NOW)).toBe(MAX_BATCHES * BATCH);
    expect(queries.cachedBefore).toHaveBeenCalledTimes(50);
  });

  it('never throws: a failing read or clear is logged and the count so far returned', async () => {
    const reading = setup();
    reading.queries.cachedBefore.mockRejectedValue(new Error('db down'));
    expect(await reading.job.runOnce(NOW)).toBe(0);
    const clearing = setup(batch(BATCH), batch(BATCH));
    clearing.queries.clearPaths.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('denied'));
    expect(await clearing.job.runOnce(NOW)).toBe(BATCH);
  });

  it('does not run on boot, runs after 15 minutes, and clears its timers on shutdown', async () => {
    vi.useFakeTimers({ now: NOW });
    const { job, queries } = setup();
    job.onApplicationBootstrap();
    expect(queries.cachedBefore).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(15 * 60_000);
    expect(queries.cachedBefore).toHaveBeenCalledTimes(1);
    job.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(48 * 3_600_000);
    expect(queries.cachedBefore).toHaveBeenCalledTimes(1);
  });
});
