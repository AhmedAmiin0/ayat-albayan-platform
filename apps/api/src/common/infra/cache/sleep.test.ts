import { afterEach, describe, expect, it, vi } from 'vitest';
import { sleep } from './sleep';

describe('sleep', () => {
  afterEach(() => vi.useRealTimers());

  it('resolves after the given ms, not before', async () => {
    vi.useFakeTimers();
    let done = false;
    const wait = sleep(2_000).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(1_999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await wait;
    expect(done).toBe(true);
  });
});
