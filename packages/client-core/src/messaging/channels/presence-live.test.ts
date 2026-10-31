import { describe, expect, it, vi } from 'vitest';
import { presenceTopic, trackSelf } from './presence-live.js';
import { fakeRealtime } from './presence.fakes.test-util.js';

const ME = '11111111-1111-1111-1111-111111111111';

describe('trackSelf', () => {
  it('joins its own private topic keyed by the user and tracks once subscribed', async () => {
    const rt = fakeRealtime();
    trackSelf(rt, ME);
    const [ch] = rt.joined;
    expect(ch?.topic).toBe(presenceTopic(ME));
    expect(ch?.config).toEqual({ private: true, presence: { key: ME } });
    expect(ch?.tracked).toEqual([]);
    ch?.status('SUBSCRIBED');
    await Promise.resolve();
    expect(ch?.tracked).toHaveLength(1);
  });

  it('leaves on stop, and joins nothing without a user', () => {
    const rt = fakeRealtime();
    trackSelf(rt, ME)();
    expect(rt.removed).toHaveLength(1);
    trackSelf(rt, '');
    expect(rt.joined).toHaveLength(1);
  });

  it('sets the session auth first, and joins nothing once stopped before it settles', async () => {
    const rt = fakeRealtime();
    const setAuth = vi.fn(() => Promise.resolve());
    const stop = trackSelf({ ...rt, realtime: { setAuth } }, ME);
    stop();
    await Promise.resolve();
    expect(setAuth).toHaveBeenCalled();
    expect(rt.joined).toHaveLength(0);
  });

  it('never throws when realtime does', () => {
    const rt = fakeRealtime();
    const broken = {
      ...rt,
      channel: () => {
        throw new Error('no socket');
      },
    };
    expect(() => trackSelf(broken, ME)()).not.toThrow();
  });
});
