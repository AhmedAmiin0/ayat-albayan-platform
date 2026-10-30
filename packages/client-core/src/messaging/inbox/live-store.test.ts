import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chatLiveKey } from './inbox-live.js';
import { createInboxLive } from './live-store.js';

const OPEN = '+966500000001';
const OTHER = '+966500000002';

function setup() {
  const live = createInboxLive();
  const targets = { chat: vi.fn(), list: vi.fn(), badge: vi.fn() };
  const unbind = live.bind(targets);
  return { live, targets, unbind };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createInboxLive: events → throttled refreshes', () => {
  it('an event for the open chat fetches that chat once, the list and the badge once', () => {
    const { live, targets } = setup();
    live.watch(chatLiveKey(OPEN));
    live.watch('list');
    live.changed({ phone: OPEN });
    expect(targets.chat).toHaveBeenCalledTimes(1);
    expect(targets.chat).toHaveBeenCalledWith(OPEN);
    expect(targets.list).toHaveBeenCalledTimes(1);
    expect(targets.badge).toHaveBeenCalledTimes(1);
  });

  it('another phone’s event refreshes only the list and the badge', () => {
    const { live, targets } = setup();
    live.watch(chatLiveKey(OPEN));
    live.watch('list');
    live.changed({ phone: OTHER });
    expect(targets.chat).not.toHaveBeenCalled();
    expect(targets.list).toHaveBeenCalledTimes(1);
  });

  it('a burst of 20 events → at most 2 fetches per target', () => {
    const { live, targets } = setup();
    live.watch(chatLiveKey(OPEN));
    live.watch('list');
    for (let i = 0; i < 20; i += 1) live.changed({ phone: i % 2 ? OPEN : OTHER });
    vi.advanceTimersByTime(10_000);
    for (const fn of [targets.chat, targets.list, targets.badge]) expect(fn.mock.calls.length).toBeLessThanOrEqual(2);
    expect(targets.chat).toHaveBeenCalledTimes(2);
  });

  it('a malformed event refreshes nothing', () => {
    const { live, targets } = setup();
    live.watch('list');
    live.changed({ body: 'x' });
    expect(targets.list).not.toHaveBeenCalled();
    expect(targets.badge).not.toHaveBeenCalled();
  });

  it('resync refreshes the badge and what is on screen once', () => {
    const { live, targets } = setup();
    const release = live.watch(chatLiveKey(OPEN));
    live.resync();
    expect([targets.chat.mock.calls.length, targets.list.mock.calls.length, targets.badge.mock.calls.length]).toEqual([1, 0, 1]);
    release();
    vi.advanceTimersByTime(5_000);
    live.resync();
    expect(targets.chat).toHaveBeenCalledTimes(1);
  });

  it('a change while the chats tab is under a chat refreshes it once when it is back', () => {
    const { live, targets } = setup();
    live.watch('list')();
    live.changed({ phone: OTHER });
    expect(targets.list).not.toHaveBeenCalled();
    live.watch('list');
    expect(targets.list).toHaveBeenCalledTimes(1);
  });

  it('isLive notifies its subscribers; unbind drops the targets, pending refreshes and the live flag', () => {
    const { live, targets, unbind } = setup();
    const listener = vi.fn();
    live.subscribe(listener);
    live.setLive(true);
    live.setLive(true);
    expect([live.isLive(), listener.mock.calls.length]).toEqual([true, 1]);
    live.watch('list');
    live.changed({ phone: OPEN });
    live.changed({ phone: OPEN });
    unbind();
    vi.advanceTimersByTime(5_000);
    live.changed({ phone: OPEN });
    expect(targets.list).toHaveBeenCalledTimes(1);
    expect(live.isLive()).toBe(false);
  });
});
