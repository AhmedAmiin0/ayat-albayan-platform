import { describe, expect, it, vi } from 'vitest';
import { inboxSearchCalls } from '../inbox';
import { messageHits, messageSearchKey, messageSearchPages } from './message-search';

const ID = 'b1111111-1111-4111-8111-111111111111';
const HIT = {
  id: ID,
  created_at: '2026-10-01T09:30:00.123456+00:00',
  snippet: 'درس اليوم',
  phone_e164: '+966500000001',
  display_name: 'ولي أمر',
};

describe('messageSearchKey', () => {
  it('sits under threads', () => {
    expect(messageSearchKey('abc')).toEqual(['threads', 'message-search', 'abc']);
  });
});

describe('messageSearchPages', () => {
  it('is enabled only from 3 folded characters', () => {
    const messages = vi.fn();
    expect(messageSearchPages('اَبْ', { messages }).enabled).toBe(false);
    expect(messageSearchPages('درس', { messages }).enabled).toBe(true);
    expect(messageSearchPages('درس', { messages }).staleTime).toBe(30_000);
  });

  it('asks per cursor and pages on until a null cursor', async () => {
    const messages = vi.fn().mockResolvedValue({ items: [HIT], next_cursor: 'n' });
    const o = messageSearchPages('درس', { messages });
    const page = await o.queryFn({ pageParam: 'c_1' });
    expect(messages).toHaveBeenCalledWith({ q: 'درس', cursor: 'c_1' });
    expect(o.getNextPageParam(page)).toBe('n');
    expect(o.getNextPageParam({ items: [], next_cursor: null })).toBeUndefined();
    expect(messageHits([page, page])).toHaveLength(2);
    expect(messageHits(undefined)).toEqual([]);
  });

  it('a malformed answer surfaces as an error', async () => {
    const apiFetch = vi.fn().mockResolvedValue({ items: [{ id: 'x' }], next_cursor: null });
    const calls = inboxSearchCalls({ apiFetch, apiSend: vi.fn() });
    await expect(
      messageSearchPages('درس', calls).queryFn({ pageParam: undefined }),
    ).rejects.toThrow();
  });
});
