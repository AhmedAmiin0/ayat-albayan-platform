import { activitySessionRoutes } from '@ab/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REPORT_TIMEOUT_MS, reportSession } from './session-activity';

const call = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', () => ({ call }));

describe('reportSession («سجل النشاط»)', () => {
  beforeEach(() => {
    call.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('posts the event on its route object with no body (no email, no password)', async () => {
    call.mockResolvedValue(undefined);
    await reportSession('loginFailed');
    expect(call).toHaveBeenCalledWith(
      expect.objectContaining({ route: activitySessionRoutes.loginFailed }),
    );
    expect(call.mock.calls[0]?.[0]).not.toHaveProperty('body');
  });

  it('never throws when the API is down or refuses', async () => {
    call.mockImplementation(() => Promise.reject(new Error('429')));
    await reportSession('logout');
    expect(call).toHaveBeenCalledWith(
      expect.objectContaining({ route: activitySessionRoutes.logout }),
    );
  });

  it('gives up after the timeout and aborts a request that never answers', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    call.mockImplementation((request: { signal?: AbortSignal }) => {
      signal = request.signal;
      return new Promise(() => undefined);
    });
    let done = false;
    const run = reportSession('login').then(() => {
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
