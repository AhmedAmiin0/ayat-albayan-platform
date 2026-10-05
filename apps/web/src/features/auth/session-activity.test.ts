import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REPORT_TIMEOUT_MS, reportSession } from './session-activity';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ apiFetch }));

describe('reportSession («سجل النشاط»)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('posts the event with no body (no email, no password)', async () => {
    apiFetch.mockResolvedValue(undefined);
    await reportSession('login-failed');
    expect(apiFetch).toHaveBeenCalledWith('/activity/session/login-failed', expect.objectContaining({ method: 'POST' }));
    expect(apiFetch.mock.calls[0]?.[1]).not.toHaveProperty('body');
  });

  it('never throws when the API is down or refuses', async () => {
    apiFetch.mockImplementation(() => Promise.reject(new Error('429')));
    await reportSession('logout');
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('gives up after the timeout and aborts a request that never answers', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    apiFetch.mockImplementation((_path: string, init: RequestInit) => {
      signal = init.signal ?? undefined;
      return new Promise(() => undefined);
    });
    let done = false;
    const run = reportSession('logout').then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(REPORT_TIMEOUT_MS - 1);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await run;
    expect(done).toBe(true);
    expect(signal?.aborted).toBe(true);
  });
});
