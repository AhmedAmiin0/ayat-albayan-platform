import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { threadReadCalls } from '../thread-reads-api';

const ID = 'c0000000-0000-4000-8000-000000000001';
const VIEW = {
  phone_e164: '+966501234567',
  display_name: null,
  last_message_id: ID,
  last_direction: 'inbound',
  last_body: 'السلام عليكم',
  last_template_key: null,
  last_status: 'delivered',
  last_media_mime: null,
  last_message_at: '2026-10-02T08:00:00Z',
  last_inbound_at: '2026-10-02T08:00:00Z',
  unread_count: 1,
  lead_id: null,
  lead_name: null,
  lead_status: null,
  lead_source: null,
  guardian_id: null,
  guardian_name: null,
  guardian_tz: null,
  teacher_id: null,
  teacher_name: null,
  session_open: true,
  subscribed: false,
};
const PAGE = { items: [VIEW], total: 1, page: 1, pageSize: 25 };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async (_path: string, _init?: RequestInit) => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('thread read calls: list', () => {
  it('asks one page with its filters in the order given and the caller signal', async () => {
    const { client, apiFetch } = clientAnswering(PAGE);
    const abort = new AbortController();
    const query = { search: 'أم', unread: 'true', page: 2, pageSize: 25 } as const;
    await expect(threadReadCalls(client).list(query, abort.signal)).resolves.toEqual(PAGE);
    expect(apiFetch.mock.calls).toEqual([
      ['/threads?search=%D8%A3%D9%85&unread=true&page=2&pageSize=25', { signal: abort.signal }],
    ]);
  });

  it('leaves out the filters that are not set', async () => {
    const { client, apiFetch } = clientAnswering(PAGE);
    await threadReadCalls(client).list({ list: undefined, page: 1, pageSize: 25 });
    expect(apiFetch.mock.calls).toEqual([['/threads?page=1&pageSize=25']]);
  });

  it('refuses a page whose chat has no last message', async () => {
    const { last_message_id: _id, ...bare } = VIEW;
    const { client } = clientAnswering({ ...PAGE, items: [bare] });
    await expect(threadReadCalls(client).list({ page: 1 })).rejects.toBeInstanceOf(ApiError);
  });
});
