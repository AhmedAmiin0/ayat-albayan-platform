import type { ThreadView } from '@ab/shared';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { threadsQuery } from './api';
import { heldRead, thread } from './patch-fixtures';
import { rereadList } from './reread';

// docs/44 K1 (#693 review): a list event during the list's FIRST load joins it (nothing to
// cancel), so one more read follows that load: the event's change never waits for the 20 s poll.

const mockApiFetch = vi.fn();
vi.mock('@/lib/http/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args) as unknown,
}));

const LIST = threadsQuery({ page: 1 });
const list = (...items: ThreadView[]) => ({ items, total: items.length });
const listed = (client: QueryClient) => client.getQueryData(LIST.queryKey)?.items[0]?.last_status;

/** The list counts as on screen (the re-read's type: 'active'). */
function shown(client: QueryClient): void {
  const query = client.getQueryCache().find({ queryKey: LIST.queryKey, exact: true });
  if (query) vi.spyOn(query, 'isActive').mockReturnValue(true);
}

beforeEach(() => mockApiFetch.mockReset());

it('an event during the first load: joined, then exactly one more read after it', async () => {
  const client = new QueryClient();
  const firstLoad = heldRead<unknown>();
  mockApiFetch.mockReturnValueOnce(firstLoad.promise);
  const opening = client.query(LIST);
  await vi.waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));
  shown(client);
  rereadList(client);
  rereadList(client); // a second event during the same load: still one more read
  expect(mockApiFetch).toHaveBeenCalledTimes(1);
  mockApiFetch.mockResolvedValue(list(thread('a', 'delivered')));
  firstLoad.resolve(list(thread('a', 'sent')));
  await opening;
  await vi.waitFor(() => expect(listed(client)).toBe('delivered'));
  await new Promise((r) => setTimeout(r, 0));
  expect(mockApiFetch).toHaveBeenCalledTimes(2);
});

it('a shown list with data: one read now, cancelling an older one, nothing chained', async () => {
  const client = new QueryClient();
  mockApiFetch.mockResolvedValueOnce(list(thread('a', 'sent')));
  await client.query(LIST);
  shown(client);
  const refetch = vi.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
  rereadList(client);
  const filters = { queryKey: ['threads', 'list'], type: 'active' };
  expect(refetch.mock.calls).toEqual([[filters, { cancelRefetch: true }]]);
});
