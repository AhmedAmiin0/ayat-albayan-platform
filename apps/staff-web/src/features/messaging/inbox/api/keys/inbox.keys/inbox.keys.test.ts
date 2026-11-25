import { UNREAD_COUNT_KEY } from '@ab/client-core';
import { leadKeys } from '@/features/sales/keys';
import { describe, expect, it } from 'vitest';
import { staleAfter } from '@/test/stale-after';
import { inboxLeadKeys, isThreadDetail, threadKeys } from './inbox.keys';

const PHONE = '+966500000001';

describe('inbox keys', () => {
  it('keeps the key shapes the inbox already caches under', () => {
    expect(threadKeys.all).toEqual(['threads']);
    expect(threadKeys.lists).toEqual(['threads', 'list']);
    expect(threadKeys.list('page=1')).toEqual(['threads', 'list', 'page=1']);
    expect(threadKeys.detail(PHONE)).toEqual(['threads', 'detail', PHONE]);
    expect(threadKeys.navCount).toEqual(['threads', 'nav-count']);
    expect(threadKeys.delta(PHONE)).toEqual(['thread-delta', PHONE]);
    const pdf = threadKeys.pdfPage({ phone: PHONE, messageId: 'm1', page: 2 });
    expect(pdf).toEqual(['thread-pdf', PHONE, 'm1', 2]);
    expect(inboxLeadKeys.byPhone(PHONE)).toEqual(['leads', 'by-phone', PHONE]);
  });

  it('refreshes every list, chat and the badge after a threads write, not the delta or pdf', async () => {
    const pdf = threadKeys.pdfPage({ phone: PHONE, messageId: 'm1', page: 1 });
    const under = [threadKeys.list(''), threadKeys.detail(PHONE), [...UNREAD_COUNT_KEY]];
    const keys = [...under, threadKeys.delta(PHONE), pdf];
    expect(await staleAfter(keys, threadKeys.all)).toEqual(under);
  });

  it('refreshes the badge from the nav count root and leaves the lists', async () => {
    const keys = [threadKeys.list(''), [...UNREAD_COUNT_KEY]];
    expect(await staleAfter(keys, threadKeys.navCount)).toEqual([[...UNREAD_COUNT_KEY]]);
  });

  it('refreshes the chat lead after a lead write', async () => {
    const lead = inboxLeadKeys.byPhone(PHONE);
    expect(await staleAfter([lead, threadKeys.all], leadKeys.all)).toEqual([lead]);
  });

  it('tells a chat detail apart from the other threads reads', () => {
    expect(isThreadDetail(threadKeys.detail(PHONE))).toBe(true);
    expect(isThreadDetail(threadKeys.list(''))).toBe(false);
    expect(isThreadDetail([...UNREAD_COUNT_KEY])).toBe(false);
  });
});
