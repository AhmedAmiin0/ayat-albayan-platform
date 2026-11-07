import type { LiveRow } from '@ab/client-core';
import type { MessageStatus, MessageView, ThreadView } from '@ab/shared';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { patchLiveCaches } from './live-patch';

// docs/44 K1 on the web: the push's ticks go straight into the chat and list caches.

const PHONE = '+966500000001';
const OTHER = '+966500000002';
const LIST_KEY = ['threads', 'list', ''];
const CHAT_KEY = ['threads', 'detail', PHONE];

const live = (id: string, s: MessageStatus): LiveRow => ({
  id,
  s,
  d: 'outbound',
  at: '2026-11-07T10:00:00Z',
});
const msg = (id: string, status: MessageStatus) => ({ id, status, body: id }) as MessageView;
const thread = (phone: string, id: string, status: MessageStatus) =>
  ({ phone_e164: phone, last_message_id: id, last_status: status }) as ThreadView;

function seed(chat: MessageView[] | null, items: ThreadView[]) {
  const client = new QueryClient();
  if (chat)
    client.setQueryData(
      CHAT_KEY,
      { pages: [{ messages: chat, has_more: false }], pageParams: [null] },
      { updatedAt: 100 },
    );
  client.setQueryData(LIST_KEY, { items }, { updatedAt: 50 });
  const statuses = () =>
    client
      .getQueryData<{ pages: { messages: MessageView[] }[] }>(CHAT_KEY)
      ?.pages[0]?.messages.map((m) => m.status);
  const listed = () =>
    client.getQueryData<{ items: ThreadView[] }>(LIST_KEY)?.items.map((t) => t.last_status);
  return { client, statuses, listed };
}

describe('patchLiveCaches', () => {
  it('moves the chat and the list tick, keeps their read times, and needs no re-read', () => {
    const { client, statuses, listed } = seed(
      [msg('a', 'queued'), msg('b', 'sent')],
      [thread(PHONE, 'b', 'sent')],
    );
    const fetch = vi.spyOn(client, 'refetchQueries');
    expect(patchLiveCaches(client, PHONE, [live('a', 'sent'), live('b', 'delivered')])).toBe(true);
    expect(statuses()).toEqual(['sent', 'delivered']);
    expect(listed()).toEqual(['delivered']);
    expect(client.getQueryState(CHAT_KEY)?.dataUpdatedAt).toBe(100);
    expect(client.getQueryState(LIST_KEY)?.dataUpdatedAt).toBe(50);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('never takes ✓✓ back; failed always replaces', () => {
    const { client, statuses } = seed([msg('a', 'read'), msg('b', 'delivered')], []);
    expect(patchLiveCaches(client, PHONE, [live('a', 'delivered'), live('b', 'failed')])).toBe(
      true,
    );
    expect(statuses()).toEqual(['read', 'failed']);
  });

  it('an id no cache holds: the known tick moves, the caller still re-reads', () => {
    const { client, statuses } = seed([msg('a', 'queued')], []);
    expect(patchLiveCaches(client, PHONE, [live('a', 'sent'), live('new', 'queued')])).toBe(false);
    expect(statuses()).toEqual(['sent']);
  });

  it('a chat not loaded: the list row of its last message is enough', () => {
    const { client, listed } = seed(null, [thread(PHONE, 'a', 'sent'), thread(OTHER, 'x', 'sent')]);
    expect(patchLiveCaches(client, PHONE, [live('a', 'read')])).toBe(true);
    expect(listed()).toEqual(['read', 'sent']);
  });

  it('another phone’s list row is never taken as held', () => {
    const { client } = seed(null, [thread(OTHER, 'a', 'sent')]);
    expect(patchLiveCaches(client, PHONE, [live('a', 'read')])).toBe(false);
  });
});
