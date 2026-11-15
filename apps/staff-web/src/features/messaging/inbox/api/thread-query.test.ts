import { QueryClient } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { threadsQuery } from './api';
import { threadQuery } from './thread-query';

// docs/43 AU8: the chat's and the list's reads carry TanStack's signal, so a superseded or
// abandoned read is freed instead of finishing in the background.

const mockApiFetch = vi.fn();
vi.mock('@/lib/http/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args) as unknown,
}));

beforeEach(() => mockApiFetch.mockReset().mockResolvedValue({ messages: [], has_more: false }));

it("a chat page's read gets the query's signal", async () => {
  const client = new QueryClient();
  await client.infiniteQuery(threadQuery('+966501234567'));
  const [path, init] = mockApiFetch.mock.calls[0] as [string, RequestInit];
  expect(path).toBe('/threads/%2B966501234567');
  expect(init.signal).toBeInstanceOf(AbortSignal);
});

it("the chats list's read gets the query's signal", async () => {
  mockApiFetch.mockResolvedValue({ items: [], total: 0 });
  const client = new QueryClient();
  await client.query(threadsQuery({ page: 1 }));
  const [path, init] = mockApiFetch.mock.calls[0] as [string, RequestInit];
  expect(path).toContain('/threads?');
  expect(init.signal).toBeInstanceOf(AbortSignal);
});
