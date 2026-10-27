import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import type { BalanceQueries } from '../../../finance/subscriptions/money/balance.queries';
import type { PackagesService } from '../../../finance/subscriptions/money/packages.service';
import { isUnreadBadge, unreadThreadCount } from './threads-unread.queries';
import { ThreadsQueries } from './threads.queries';

const badge = { page: 1, pageSize: 1, unread: true };
const queries = (f: ReturnType<typeof fakeDb>) =>
  new ThreadsQueries(f.db, undefined as unknown as PackagesService, undefined as unknown as BalanceQueries);

describe('the unread badge fast path (GET /threads?unread=true&pageSize=1)', () => {
  it('only the bare badge request takes it: any list, status or search filter, or a real page, reads v_threads', () => {
    expect(isUnreadBadge(badge)).toBe(true);
    expect(isUnreadBadge({ ...badge, phones: ['+966500000001'] })).toBe(true);
    expect(isUnreadBadge({ ...badge, unread: false })).toBe(false);
    expect(isUnreadBadge({ ...badge, pageSize: 25 })).toBe(false);
    expect(isUnreadBadge({ ...badge, list: 'l1' })).toBe(false);
    expect(isUnreadBadge({ ...badge, status: 'new' })).toBe(false);
    expect(isUnreadBadge({ ...badge, search: 'هبة' })).toBe(false);
  });

  it('list: an indexed head count of thread_summaries (unread_count > 0), no page, never v_threads', async () => {
    const f = fakeDb({ thread_summaries: [{ count: 7 }] });
    expect(await queries(f).list(badge)).toEqual({ items: [], total: 7 });
    expect(f.argsOf('thread_summaries', 'select')).toEqual(['phone_e164', { count: 'exact', head: true }]);
    expect(f.argsOf('thread_summaries', 'gt')).toEqual(['unread_count', 0]);
    expect(f.calls.some((c) => c.table === 'v_threads')).toBe(false);
  });

  it('a scope (teacher mode phones) narrows the count the same way the list would', async () => {
    const f = fakeDb({ thread_summaries: [{ count: 1 }] });
    expect(await unreadThreadCount(f.db, ['+966500000001', '+966500000002'])).toBe(1);
    expect(f.argsOf('thread_summaries', 'in')).toEqual(['phone_e164', ['+966500000001', '+966500000002']]);
  });

  it('any other list request still pages v_threads', async () => {
    const f = fakeDb({ v_threads: [{ data: [], count: 0 }] });
    await queries(f).list({ ...badge, pageSize: 25 });
    expect(f.calls.some((c) => c.table === 'v_threads')).toBe(true);
    expect(f.calls.some((c) => c.table === 'thread_summaries')).toBe(false);
  });

  it('a failed count throws (never a silent 0)', async () => {
    const f = fakeDb({ thread_summaries: [{ error: { message: 'boom' } }] });
    await expect(unreadThreadCount(f.db)).rejects.toThrow('unread threads count failed: boom');
  });
});
