import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { MessageSearchRepo } from './message-search.repo';

const AT = '2026-10-01T09:30:00.123456+00:00';
const ID = 'b1111111-1111-4111-8111-111111111111';

describe('MessageSearchRepo.search', () => {
  it('one RPC with the words as an argument, the raw cursor and limit + 1', async () => {
    const { db, argsOf, trips } = fakeDb({ 'rpc:search_messages': [{ data: [] }] });
    const input = { q: '50%_x', phones: null, hide: ['+966500000009'], skipTemplates: ['t'] };
    await new MessageSearchRepo(db).search({ ...input, before: { at: AT, id: ID }, limit: 30 });
    expect(argsOf('rpc:search_messages', 'rpc')).toEqual([
      {
        p_q: '50%_x',
        p_phones: null,
        p_hide: ['+966500000009'],
        p_skip_templates: ['t'],
        p_before_at: AT,
        p_before_id: ID,
        p_limit: 31,
      },
    ]);
    expect(trips).toEqual(['rpc:search_messages']);
  });

  it('the first page has no cursor; a failed RPC throws', async () => {
    const { db, argsOf } = fakeDb({ 'rpc:search_messages': [{ error: { message: 'boom' } }] });
    const input = { q: 'abc', phones: ['+1'], hide: [], skipTemplates: [], before: null, limit: 30 };
    await expect(new MessageSearchRepo(db).search(input)).rejects.toThrow('message search failed');
    expect(argsOf('rpc:search_messages', 'rpc')?.[0]).toMatchObject({ p_before_at: null, p_before_id: null });
  });
});
