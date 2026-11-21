import { describe, expect, it, vi } from 'vitest';
import { BeatBook } from './beat-book';
import { beatTick } from './beat-tick';

const plan = { name: 'OwnTimerJob', everyMs: 60_000, firstMs: 10 };
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('beatTick (a job with its own timers records each timed pass)', () => {
  it('registers at once; a finished pass is a success', async () => {
    let now = 100;
    const book = new BeatBook(() => now);
    const tick = beatTick(plan, async () => undefined, book);
    expect(book.list()[0]).toMatchObject({ name: 'OwnTimerJob', since: 110, lastOkAt: null });
    now = 200;
    tick();
    await flush();
    expect(book.list()[0]?.lastOkAt).toBe(200);
  });

  it('a rejected pass is an error, never thrown out of the timer', async () => {
    const book = new BeatBook(() => 5);
    const tick = beatTick(plan, () => Promise.reject(new Error('db timeout')), book);
    expect(() => tick()).not.toThrow();
    await flush();
    expect(book.list()[0]).toMatchObject({ lastOkAt: null, lastErrorAt: 5, lastError: 'db timeout' });
  });

  it('a pass that never ends records nothing (the job goes stale)', async () => {
    const book = new BeatBook(() => 5);
    const run = vi.fn(() => new Promise<void>(() => undefined));
    beatTick(plan, run, book)();
    await flush();
    expect(book.list()[0]).toMatchObject({ lastOkAt: null, lastErrorAt: null });
  });
});
