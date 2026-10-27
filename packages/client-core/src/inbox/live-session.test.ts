import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLiveSession } from './live-session.js';

function fake() {
  const stops: ReturnType<typeof vi.fn>[] = [];
  const open = vi.fn(() => {
    const stop = vi.fn();
    stops.push(stop);
    return stop;
  });
  const resync = vi.fn();
  /** Connections opened and not stopped. */
  const joined = () => stops.filter((s) => s.mock.calls.length === 0).length;
  return { session: createLiveSession(open, resync), open, resync, joined };
}

beforeEach(() => void vi.useFakeTimers());
afterEach(() => void vi.useRealTimers());

describe('createLiveSession', () => {
  it('resume joins once; resumed again while joined it resyncs instead of joining twice', () => {
    const f = fake();
    f.session.resume();
    f.session.resume();
    expect([f.open.mock.calls.length, f.resync.mock.calls.length, f.joined()]).toEqual([1, 1, 1]);
  });

  it('pause(0) leaves at once; pause(ms) leaves when it ends, unless resumed first (no timer left)', () => {
    const f = fake();
    f.session.resume();
    f.session.pause(5_000);
    vi.advanceTimersByTime(4_999);
    f.session.resume();
    expect([f.joined(), vi.getTimerCount()]).toEqual([1, 0]);
    f.session.pause(5_000);
    vi.advanceTimersByTime(5_000);
    expect([f.joined(), vi.getTimerCount()]).toEqual([0, 0]);
    f.session.resume();
    f.session.pause(0);
    expect([f.joined(), f.open.mock.calls.length, vi.getTimerCount()]).toEqual([0, 2, 0]);
  });

  it('rapid flips never hold two connections or a timer; a pause while left sets no timer', () => {
    const f = fake();
    for (let i = 0; i < 50; i += 1) {
      f.session.resume();
      expect(f.joined()).toBeLessThanOrEqual(1);
      f.session.pause(i % 2 ? 0 : 1_000);
    }
    vi.runAllTimers();
    f.session.pause(1_000);
    expect([f.joined(), vi.getTimerCount()]).toEqual([0, 0]);
  });

  it('end leaves, clears the timer and ignores later resumes', () => {
    const f = fake();
    f.session.resume();
    f.session.pause(1_000);
    f.session.end();
    f.session.resume();
    expect([f.joined(), f.open.mock.calls.length, vi.getTimerCount()]).toEqual([0, 1, 0]);
  });
});
