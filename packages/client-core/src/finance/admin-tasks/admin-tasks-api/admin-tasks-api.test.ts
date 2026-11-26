import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { adminTaskCalls } from './admin-tasks-api';

const ID = '5a000000-0000-4000-8000-000000000001';
const task = {
  id: ID,
  kind: 'subscription_unpaid',
  subject_type: 'subscription',
  subject_id: ID,
  student: null,
  title: null,
  due_at: null,
  done_at: '2026-11-02T09:00:00Z',
  created_at: '2026-11-01T09:00:00Z',
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('adminTaskCalls', () => {
  it('reads the open tasks', async () => {
    const page = { items: [task], total: 1, page: 1, pageSize: 50 };
    const { client, apiFetch } = clientAnswering(page);
    await expect(adminTaskCalls(client).list({ open: 'true', pageSize: 50 })).resolves.toEqual(
      page,
    );
    expect(apiFetch).toHaveBeenCalledWith('/admin-tasks?open=true&pageSize=50');
  });

  it('marks one done', async () => {
    const { client, apiSend } = clientAnswering(task);
    await expect(adminTaskCalls(client).done(ID)).resolves.toEqual(task);
    expect(apiSend).toHaveBeenCalledWith('POST', `/admin-tasks/${ID}/done`, undefined);
  });

  it('refuses a done answer that is not a task', async () => {
    const { client } = clientAnswering({ ok: true });
    const failure = await adminTaskCalls(client)
      .done(ID)
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
