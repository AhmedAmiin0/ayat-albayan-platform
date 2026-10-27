import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../common/db/db.module';
import { readerOf } from '../../../common/settings/settings.fakes';
import { LessonsQueries } from './lessons.queries';
import { LessonsSettings } from './lessons.settings';

/** A v_lesson_sequence read that takes one 60 ms round trip per chunk. */
function slowDb() {
  const chain = { select: () => chain, in: () => new Promise((done) => setTimeout(() => done({ data: [], error: null }), 60)) };
  return { from: vi.fn(() => chain) } as unknown as Db;
}

describe('LessonsQueries.seq — the chunks in parallel (week / day views)', () => {
  afterEach(() => vi.useRealTimers());

  it('250 completed lessons: 3 chunk reads in ONE round trip (was 3 sequential)', async () => {
    vi.useFakeTimers();
    const db = slowDb();
    const ids = Array.from({ length: 250 }, (_, i) => `l${i}`);
    const start = Date.now();
    const done = new LessonsQueries(db, readerOf(LessonsSettings)).seq(ids);
    await vi.advanceTimersByTimeAsync(60);
    await done;
    expect(Date.now() - start).toBe(60);
    expect(db.from).toHaveBeenCalledTimes(3);
  });
});
