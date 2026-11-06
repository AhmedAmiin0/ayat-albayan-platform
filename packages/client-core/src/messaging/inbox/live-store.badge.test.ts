import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chatLiveKey } from './inbox-live.js';
import { createInboxLive } from './live-store.js';

const OPEN = '+966500000001';
const OTHER = '+966500000002';

function setup(chatOwnsBadge: boolean) {
  const live = createInboxLive({ chatOwnsBadge });
  const targets = { chat: vi.fn(), list: vi.fn(), badge: vi.fn() };
  live.bind(targets);
  return { live, targets };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createInboxLive({ chatOwnsBadge }): the badge on an event (docs/43 AU6)', () => {
  it('an event for the chat on screen re-reads that chat and the list, never the badge', () => {
    const { live, targets } = setup(true);
    live.watch(chatLiveKey(OPEN));
    live.watch('list');
    for (let i = 0; i < 5; i += 1) live.changed({ phone: OPEN });
    vi.advanceTimersByTime(10_000);
    expect(targets.chat).toHaveBeenCalledWith(OPEN);
    expect(targets.list).toHaveBeenCalled();
    expect(targets.badge).not.toHaveBeenCalled();
  });

  it('an event for another chat still re-reads the badge', () => {
    const { live, targets } = setup(true);
    live.watch(chatLiveKey(OPEN));
    live.changed({ phone: OTHER });
    expect(targets.badge).toHaveBeenCalledTimes(1);
    expect(targets.chat).not.toHaveBeenCalled();
  });

  it('the chat left the screen: its events re-read the badge again', () => {
    const { live, targets } = setup(true);
    const release = live.watch(chatLiveKey(OPEN));
    release();
    live.changed({ phone: OPEN });
    expect(targets.badge).toHaveBeenCalledTimes(1);
    expect(targets.chat).not.toHaveBeenCalled();
  });

  it('without the option (web): the badge on every event, the open chat included', () => {
    const { live, targets } = setup(false);
    live.watch(chatLiveKey(OPEN));
    live.changed({ phone: OPEN });
    expect(targets.badge).toHaveBeenCalledTimes(1);
    expect(targets.chat).toHaveBeenCalledTimes(1);
  });

  it('resync still re-reads the badge with a chat on screen', () => {
    const { live, targets } = setup(true);
    live.watch(chatLiveKey(OPEN));
    live.resync();
    expect(targets.badge).toHaveBeenCalledTimes(1);
    expect(targets.chat).toHaveBeenCalledTimes(1);
  });
});
