import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { inboxSearchCalls } from '../inbox-search-api';

const ID = 'b1111111-1111-4111-8111-111111111111';
const CURSOR = `2026-10-01T09:30:00.123456+00:00_${ID}`;
const HIT = { id: ID, created_at: '2026-10-01T09:30:00.123456+00:00', snippet: 'درس اليوم' };
const GLOBAL = { items: [{ ...HIT, phone_e164: '+966500000001', display_name: null }] };
const CHAT = { items: [HIT], total: 1, next_cursor: null };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch };
};

describe('inbox search calls', () => {
  it('asks the global search with the words encoded and the cursor only when given', async () => {
    const answer = { ...GLOBAL, next_cursor: CURSOR };
    const { client, apiFetch } = clientAnswering(answer);
    const calls = inboxSearchCalls(client);
    await expect(calls.messages({ q: 'درس 50%' })).resolves.toEqual(answer);
    await calls.messages({ q: 'abc', cursor: 'c_1' });
    expect(apiFetch.mock.calls).toEqual([
      [`/threads/search?q=${encodeURIComponent('درس 50%')}`],
      ['/threads/search?q=abc&cursor=c_1'],
    ]);
  });

  it('asks one chat with its number encoded in the path', async () => {
    const { client, apiFetch } = clientAnswering(CHAT);
    const calls = inboxSearchCalls(client);
    await expect(calls.chat({ phone: '+966500000001' }, { q: 'درس' })).resolves.toEqual(CHAT);
    await calls.chat({ phone: '+1' }, { q: 'a', cursor: 'c_1' });
    expect(apiFetch.mock.calls).toEqual([
      [`/threads/%2B966500000001/search?q=${encodeURIComponent('درس')}`],
      ['/threads/%2B1/search?q=a&cursor=c_1'],
    ]);
  });

  it('refuses a chat page with no total and a global hit with no chat', async () => {
    const noTotal = inboxSearchCalls(clientAnswering({ items: [HIT], next_cursor: null }).client);
    await expect(noTotal.chat({ phone: '+1' }, { q: 'a' })).rejects.toBeInstanceOf(ApiError);
    const noChat = inboxSearchCalls(clientAnswering({ items: [HIT], next_cursor: null }).client);
    await expect(noChat.messages({ q: 'abc' })).rejects.toBeInstanceOf(ApiError);
  });
});
