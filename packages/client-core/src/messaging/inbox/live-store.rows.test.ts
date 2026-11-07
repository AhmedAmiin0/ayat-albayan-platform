import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chatLiveKey } from './inbox-live.js';
import type { LiveRow } from './live-rows.js';
import { createInboxLive, type LiveTargets } from './live-store.js';

const OPEN = '+966500000001';
const ROWS: LiveRow[] = [{ id: 'a', s: 'delivered', d: 'outbound', at: '2026-11-07T10:00:00Z' }];

function setup(rows?: LiveTargets['rows']) {
  const live = createInboxLive();
  const order: string[] = [];
  const targets = {
    chat: vi.fn(() => order.push('chat')),
    list: vi.fn(),
    badge: vi.fn(),
    rows:
      rows && vi.fn((phone: string, r: readonly LiveRow[]) => (order.push('rows'), rows(phone, r))),
  };
  live.bind(targets);
  live.watch(chatLiveKey(OPEN));
  live.watch('list');
  return { live, targets, order };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createInboxLive: an event with rows (docs/44 K1, a visual patch only)', () => {
  it('patches first, then re-reads the chat, the list and the badge as before', async () => {
    const { live, targets, order } = setup(() => undefined);
    live.changed({ phone: OPEN, rows: ROWS });
    await vi.runAllTimersAsync();
    expect(targets.rows).toHaveBeenCalledWith(OPEN, ROWS);
    expect(order).toEqual(['rows', 'chat']);
    expect(targets.list).toHaveBeenCalledTimes(1);
    expect(targets.badge).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a failed patch (rejects)', () => Promise.reject(new Error('disk'))],
    [
      'a throwing patch',
      () => {
        throw new Error('boom');
      },
    ],
  ])('%s: the read still runs', async (_, rows: () => unknown) => {
    const { live, targets } = setup(rows);
    live.changed({ phone: OPEN, rows: ROWS });
    await vi.runAllTimersAsync();
    expect(targets.chat).toHaveBeenCalledWith(OPEN);
    expect(targets.list).toHaveBeenCalledTimes(1);
  });

  it('a {phone}-only event never asks the patch', () => {
    const { live, targets } = setup(() => undefined);
    live.changed({ phone: OPEN });
    expect(targets.rows).not.toHaveBeenCalled();
    expect(targets.chat).toHaveBeenCalledWith(OPEN);
  });

  it('an app without a patch re-reads on rows too', async () => {
    const { live, targets } = setup();
    live.changed({ phone: OPEN, rows: ROWS });
    await vi.runAllTimersAsync();
    expect(targets.chat).toHaveBeenCalledTimes(1);
  });
});
