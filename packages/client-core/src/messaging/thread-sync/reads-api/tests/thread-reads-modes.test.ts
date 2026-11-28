import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { threadReadCalls } from '../thread-reads-api';

const ID = 'c0000000-0000-4000-8000-000000000001';
const AT = '2026-10-27T10:00:00.000Z';
const PHONE = '+966500000001';
const PAGE = {
  thread: null,
  messages: [],
  has_more: false,
  lessons: [],
  people: { guardian: null, lead: null, students: [] },
};
const DELTA = { messages: [], has_more: false, pending: [] };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async (_path: string, _init?: RequestInit) => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('thread read calls: a chat page', () => {
  it('asks the page by its keyset on the encoded phone, with the caller signal', async () => {
    const { client, apiFetch } = clientAnswering(PAGE);
    const { signal } = new AbortController();
    const query = { before: AT, before_id: ID };
    await expect(threadReadCalls(client).page({ phone: PHONE, query, signal })).resolves.toEqual(
      PAGE,
    );
    const search = `?before=${encodeURIComponent(AT)}&before_id=${ID}`;
    expect(apiFetch.mock.calls).toEqual([[`/threads/%2B966500000001${search}`, { signal }]]);
  });

  it('asks the newest page with no query', async () => {
    const { client, apiFetch } = clientAnswering(PAGE);
    await threadReadCalls(client).page({ phone: PHONE, query: {} });
    expect(apiFetch.mock.calls).toEqual([['/threads/%2B966500000001']]);
  });

  it('refuses a delta where a page was asked', async () => {
    const { client } = clientAnswering(DELTA);
    const asked = threadReadCalls(client).page({ phone: PHONE, query: {} });
    await expect(asked).rejects.toBeInstanceOf(ApiError);
  });
});

describe('thread read calls: a chat delta', () => {
  it('asks what changed after the newest row, with the pending ids', async () => {
    const { client, apiFetch } = clientAnswering(DELTA);
    const query = { after: AT, pending: ID };
    await expect(threadReadCalls(client).delta({ phone: PHONE, query })).resolves.toEqual(DELTA);
    const search = `?after=${encodeURIComponent(AT)}&pending=${ID}`;
    expect(apiFetch.mock.calls).toEqual([[`/threads/%2B966500000001${search}`]]);
  });

  it('refuses a page where a delta was asked', async () => {
    const { client } = clientAnswering(PAGE);
    const asked = threadReadCalls(client).delta({ phone: PHONE, query: { after: AT } });
    await expect(asked).rejects.toBeInstanceOf(ApiError);
  });
});
