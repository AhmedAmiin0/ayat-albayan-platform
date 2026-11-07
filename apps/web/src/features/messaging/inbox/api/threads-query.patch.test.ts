import type { ThreadView } from '@ab/shared';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { threadsQuery } from './api';
import { patchLiveCaches } from './live-patch';
import { heldRead, live, PHONE, thread } from './patch-fixtures';

// docs/44 K1: the chats list's GET /threads by the patch-time rule (patch-times.ts).

const mockApiFetch = vi.fn();
vi.mock('@/lib/http/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args) as unknown,
}));

const OPTIONS = threadsQuery({ page: 1 });
const page = (...items: ThreadView[]) => ({ items, total: items.length });
const listed = (client: QueryClient) => client.getQueryData(OPTIONS.queryKey)?.items[0];
const refetch = (client: QueryClient) => client.refetchQueries({ queryKey: OPTIONS.queryKey });

beforeEach(() => mockApiFetch.mockReset());

it('a list read started before the patch keeps it; a read started after it is the truth', async () => {
  const client = new QueryClient();
  mockApiFetch.mockResolvedValue(page(thread('a', 'sent')));
  await client.query(OPTIONS);
  const stale = heldRead<unknown>();
  mockApiFetch.mockReturnValueOnce(stale.promise);
  const inFlight = refetch(client);
  await vi.waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
  patchLiveCaches(client, PHONE, [live('a', 'delivered')]);
  stale.resolve(page(thread('a', 'sent')));
  await inFlight;
  expect(listed(client)?.last_status).toBe('delivered');
  mockApiFetch.mockResolvedValue(page(thread('a', 'queued')));
  await refetch(client);
  expect(listed(client)?.last_status).toBe('queued');
});
