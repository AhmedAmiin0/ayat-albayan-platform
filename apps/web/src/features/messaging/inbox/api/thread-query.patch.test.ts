import { canReply } from '@ab/shared';
import type { MessageView, ThreadDetail } from '@ab/shared';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { patchLiveCaches } from './live-patch';
import { heldRead, live, msg, PHONE } from './patch-fixtures';
import { threadQuery } from './thread-query';

// docs/44 K1: the live patch is visual only; a chat read is the truth unless it started before
// the patch (the patch-time rule, patch-times.ts).

const mockApiFetch = vi.fn();
vi.mock('@/lib/http/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args) as unknown,
}));

const KEY = threadQuery(PHONE).queryKey;
const page = (...messages: MessageView[]) => ({ messages, has_more: false }) as ThreadDetail;
const first = (client: QueryClient) => client.getQueryData(KEY)?.pages[0]?.messages[0];
const replyable = (client: QueryClient) => canReply(first(client) ?? {});
const refetch = (client: QueryClient) => client.refetchQueries({ queryKey: KEY });

async function opened(...messages: MessageView[]) {
  const client = new QueryClient();
  mockApiFetch.mockResolvedValue(page(...messages));
  await client.infiniteQuery(threadQuery(PHONE));
  return client;
}

beforeEach(() => mockApiFetch.mockReset());

it('a read started before the patch lands after it: stays delivered; the trailing read is truth', async () => {
  const client = await opened(msg('a', 'sent'));
  const stale = heldRead<unknown>();
  mockApiFetch.mockReturnValueOnce(stale.promise);
  const inFlight = refetch(client);
  await vi.waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2)); // the request is out
  patchLiveCaches(client, PHONE, [live('a', 'delivered')]);
  expect(first(client)?.status).toBe('delivered');
  stale.resolve(page(msg('a', 'sent')));
  await inFlight;
  expect(first(client)?.status).toBe('delivered');
  mockApiFetch.mockResolvedValue(page(msg('a', 'delivered', { delivered_at: '2026-11-07T10:01' })));
  await refetch(client);
  expect(first(client)?.delivered_at).toBe('2026-11-07T10:01');
});

it('a re-queue (failed → queued) from a read started after the patch shows queued', async () => {
  const client = await opened(msg('a', 'sent'));
  patchLiveCaches(client, PHONE, [live('a', 'delivered')]);
  mockApiFetch.mockResolvedValue(page(msg('a', 'queued')));
  await refetch(client);
  expect(first(client)?.status).toBe('queued');
});

it('a sent event moves the tick; the trailing read makes the bubble replyable', async () => {
  const client = await opened(msg('a', 'queued', { replyable: false }));
  patchLiveCaches(client, PHONE, [live('a', 'sent')]);
  expect([first(client)?.status, replyable(client)]).toEqual(['sent', false]);
  mockApiFetch.mockResolvedValue(page(msg('a', 'sent', { replyable: true })));
  await refetch(client);
  expect(replyable(client)).toBe(true);
});

it('an older page loading during the patch commits its old copy: the patch goes on again', async () => {
  const client = await opened(msg('a', 'sent'));
  client.setQueryData(
    KEY,
    (d) => d && { ...d, pages: [{ ...page(msg('a', 'sent')), has_more: true }] },
  );
  const older = heldRead<unknown>();
  mockApiFetch.mockReturnValueOnce(older.promise);
  const loading = client
    .getQueryCache()
    .find({ queryKey: KEY })
    ?.fetch(undefined, {
      meta: { fetchMore: { direction: 'forward' } },
    });
  await vi.waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
  patchLiveCaches(client, PHONE, [live('a', 'read')]);
  older.resolve(page(msg('zz', 'read')));
  await loading;
  await Promise.resolve();
  expect(client.getQueryData(KEY)?.pages.map((p) => p.messages[0]?.status)).toEqual([
    'read',
    'read',
  ]);
});
