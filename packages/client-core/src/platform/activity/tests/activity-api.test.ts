import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { activityCalls } from '../activity-api';

const ROW = {
  id: 'a1',
  at: '2026-11-27T10:00:00+00:00',
  actor_id: null,
  actor_name: null,
  actor_role: 'public',
  action: 'authSession.loginFailed',
  method: 'POST',
  route: '/activity/session/login-failed',
  entity: null,
  entity_id: null,
  status: 204,
  duration_ms: 1,
  meta: {},
};
const PAGE = { items: [ROW], total: 1, page: 2, pageSize: 25 };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch };
};

describe('activity calls', () => {
  it('reads one page with its filters and sort on the path of today', async () => {
    const { client, apiFetch } = clientAnswering(PAGE);
    const query = {
      page: 2,
      pageSize: 25,
      entity: 'students',
      entity_id: 'AB-0001',
      sort: 'at',
      dir: 'desc',
    } as const;
    await expect(activityCalls(client).list(query)).resolves.toEqual(PAGE);
    expect(apiFetch.mock.calls).toEqual([
      ['/activity?page=2&pageSize=25&entity=students&entity_id=AB-0001&sort=at&dir=desc'],
    ]);
  });

  it('refuses a page whose row has no time', async () => {
    const { client } = clientAnswering({ ...PAGE, items: [{ ...ROW, at: null }] });
    await expect(activityCalls(client).list({ page: 1 })).rejects.toBeInstanceOf(ApiError);
  });
});
