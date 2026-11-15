import type { MessageStatus, MessageView, ThreadView } from '@ab/shared';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { patchLiveCaches } from './live-patch';
import { live, msg, PHONE, thread } from './patch-fixtures';

// docs/44 K1 on the web: the push's ticks go straight into the chat and list caches (a visual
// patch; the live store's re-read still runs). Reads around a patch: live-patch.reads.test.ts.

const LIST_KEY = ['threads', 'list', ''];
const CHAT_KEY = ['threads', 'detail', PHONE];

function seed(chat: MessageView[], items: ThreadView[]) {
  const client = new QueryClient();
  const pages = { pages: [{ messages: chat, has_more: false }], pageParams: [null] };
  client.setQueryData(CHAT_KEY, pages, { updatedAt: 100 });
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
  it('moves the chat and the list tick, keeps their read times, asks no request', () => {
    const { client, statuses, listed } = seed(
      [msg('a', 'queued'), msg('b', 'sent')],
      [thread('b', 'sent')],
    );
    const fetch = vi.spyOn(client, 'refetchQueries');
    patchLiveCaches(client, PHONE, [live('a', 'sent'), live('b', 'delivered')]);
    expect(statuses()).toEqual(['sent', 'delivered']);
    expect(listed()).toEqual(['delivered']);
    expect(client.getQueryState(CHAT_KEY)?.dataUpdatedAt).toBe(100);
    expect(client.getQueryState(LIST_KEY)?.dataUpdatedAt).toBe(50);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each<[MessageStatus, MessageStatus, MessageStatus]>([
    ['read', 'delivered', 'read'],
    ['delivered', 'failed', 'failed'],
    ['failed', 'queued', 'queued'],
    ['failed', 'sent_manually', 'sent_manually'],
  ])('held %s, event %s → %s (the event ordering)', (held, incoming, shown) => {
    const { client, statuses } = seed([msg('a', held)], [thread('a', held)]);
    patchLiveCaches(client, PHONE, [live('a', incoming)]);
    expect(statuses()).toEqual([shown]);
  });

  it('an id no cache holds writes nothing', () => {
    const { client } = seed([msg('a', 'sent')], [thread('a', 'sent')]);
    const set = vi.spyOn(client, 'setQueryData');
    patchLiveCaches(client, PHONE, [live('new', 'sent')]);
    expect(set).not.toHaveBeenCalled();
  });
});
