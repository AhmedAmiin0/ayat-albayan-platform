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

const ON = { phone: PHONE, watched: true };

describe('patchLiveCaches', () => {
  it('moves the chat and the list tick, keeps their read times, and needs no re-read', () => {
    const { client, statuses, listed } = seed(
      [msg('a', 'queued'), msg('b', 'sent')],
      [thread(PHONE, 'b', 'sent')],
    );
    const fetch = vi.spyOn(client, 'refetchQueries');
    expect(patchLiveCaches(client, ON, [live('a', 'sent'), live('b', 'delivered')])).toBe(true);
    expect(statuses()).toEqual(['sent', 'delivered']);
    expect(listed()).toEqual(['delivered']);
    expect(client.getQueryState(CHAT_KEY)?.dataUpdatedAt).toBe(100);
    expect(client.getQueryState(LIST_KEY)?.dataUpdatedAt).toBe(50);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('never takes ✓✓ back; failed always replaces', () => {
    const { client, statuses } = seed([msg('a', 'read'), msg('b', 'delivered')], []);
    expect(patchLiveCaches(client, ON, [live('a', 'delivered'), live('b', 'failed')])).toBe(true);
    expect(statuses()).toEqual(['read', 'failed']);
  });

  it('an id the chat does not show: the known tick moves, the caller still re-reads', () => {
    const { client, statuses } = seed([msg('a', 'queued')], []);
    expect(patchLiveCaches(client, ON, [live('a', 'sent'), live('new', 'sent')])).toBe(false);
    expect(statuses()).toEqual(['sent']);
  });

  it('a NEW message a list read landed first is never «held»: the open chat re-reads', () => {
    const { client, listed } = seed([msg('a', 'sent')], [thread(PHONE, 'm', 'sent')]);
    expect(patchLiveCaches(client, ON, [live('m', 'delivered')])).toBe(false);
    expect(listed()).toEqual(['delivered']);
  });

  it('an inbound row re-reads even when the chat holds it (the read stamps it)', () => {
    const { client } = seed([msg('m', 'delivered')], []);
    const inbound: LiveRow = { ...live('m', 'delivered'), d: 'inbound' };
    expect(patchLiveCaches(client, ON, [inbound])).toBe(false);
  });

  it('a chat not on screen never settles an event; the list still takes the tick', () => {
    const { client, listed } = seed([msg('a', 'sent')], [thread(PHONE, 'a', 'sent')]);
    expect(patchLiveCaches(client, { ...ON, watched: false }, [live('a', 'read')])).toBe(false);
    expect(listed()).toEqual(['read']);
  });

  it('another phone’s list row is never taken as held', () => {
    const { client } = seed(null, [thread(OTHER, 'a', 'sent')]);
    expect(patchLiveCaches(client, ON, [live('a', 'read')])).toBe(false);
  });
});
