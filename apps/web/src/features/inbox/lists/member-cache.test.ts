import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { threadQuery } from '../api/api';
import { CHAT_LISTS_KEY } from './api';
import { patchThreadLists } from './member-cache';

const PHONE = '+966501234567';
const PAY = { id: 'pay', name: 'بانتظار الدفع' };
const TRIAL = { id: 'trial', name: 'تجريبي' };
const key: readonly unknown[] = threadQuery(PHONE).queryKey;

function seeded(lists: unknown) {
  const client = new QueryClient();
  client.setQueryData(CHAT_LISTS_KEY, [PAY, TRIAL].map((l) => ({ ...l, count: 0 })));
  const page = (extra: object) => ({ messages: [], has_more: false, ...extra });
  client.setQueryData(key, { pageParams: ['', 'x'], pages: [page({ lists }), page({})] });
  const lists$ = () => client.getQueryData<{ pages: { lists?: unknown }[] }>(key)?.pages;
  return { client, lists$ };
}

describe('patchThreadLists: a saved toggle shows in the open chat at once', () => {
  it('in adds the list (with its name), out removes it; older pages untouched', () => {
    const { client, lists$ } = seeded([PAY]);
    patchThreadLists(client, { id: TRIAL.id, phone: PHONE, member: true });
    expect(lists$()?.[0]?.lists).toEqual([PAY, TRIAL]);
    patchThreadLists(client, { id: PAY.id, phone: PHONE, member: false });
    expect(lists$()?.[0]?.lists).toEqual([TRIAL]);
    expect(lists$()?.[1]?.lists).toBeUndefined();
  });

  it('a chat without lists (teacher view) or not cached stays as it is', () => {
    const { client, lists$ } = seeded(undefined);
    patchThreadLists(client, { id: TRIAL.id, phone: PHONE, member: true });
    expect(lists$()?.[0]?.lists).toBeUndefined();
    patchThreadLists(client, { id: TRIAL.id, phone: '+966500000000', member: true });
    expect(client.getQueryData(threadQuery('+966500000000').queryKey)).toBeUndefined();
  });
});
