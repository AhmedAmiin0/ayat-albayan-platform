import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chatLiveKey } from './inbox-live.js';
import type { LiveRow } from './live-rows.js';
import { createInboxLive, type LiveTargets } from './live-store.js';

const OPEN = '+966500000001';
const ROWS: LiveRow[] = [{ id: 'a', s: 'delivered', d: 'outbound', at: '2026-11-07T10:00:00Z' }];

function setup(rows?: LiveTargets['rows']) {
  const live = createInboxLive();
  const targets = { chat: vi.fn(), list: vi.fn(), badge: vi.fn(), rows: rows && vi.fn(rows) };
  live.bind(targets);
  live.watch(chatLiveKey(OPEN));
  live.watch('list');
  return { live, targets };
}

const reads = (t: ReturnType<typeof setup>['targets']) =>
  t.chat.mock.calls.length + t.list.mock.calls.length + t.badge.mock.calls.length;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createInboxLive: an event with rows (docs/44 K1)', () => {
  it('rows the app took whole: no re-read at all', async () => {
    const { live, targets } = setup(() => true);
    live.changed({ phone: OPEN, rows: ROWS });
    await vi.runAllTimersAsync();
    expect(targets.rows).toHaveBeenCalledWith(OPEN, ROWS);
    expect(reads(targets)).toBe(0);
  });

  it('an async patch that holds every row: no re-read either', async () => {
    const { live, targets } = setup(() => Promise.resolve(true));
    live.changed({ phone: OPEN, rows: ROWS });
    await vi.runAllTimersAsync();
    expect(reads(targets)).toBe(0);
  });

  it.each([
    ['an unknown id (false)', () => false],
    ['a failed patch (rejects)', () => Promise.reject(new Error('disk'))],
    [
      'a throwing patch',
      () => {
        throw new Error('boom');
      },
    ],
  ])('%s: the throttled read as before', async (_, rows: () => boolean | Promise<boolean>) => {
    const { live, targets } = setup(rows);
    live.changed({ phone: OPEN, rows: ROWS });
    await vi.runAllTimersAsync();
    expect(targets.chat).toHaveBeenCalledWith(OPEN);
    expect(targets.list).toHaveBeenCalledTimes(1);
    expect(targets.badge).toHaveBeenCalledTimes(1);
  });

  it('a {phone}-only event never asks the patch and re-reads at once', () => {
    const { live, targets } = setup(() => true);
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
