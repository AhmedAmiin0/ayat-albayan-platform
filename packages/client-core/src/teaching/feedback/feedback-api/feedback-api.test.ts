import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { feedbackCalls } from './feedback-api';

const summary = [
  { teacher: { id: 't1', name: 'أبرار' }, avg_rating: 4.5, n: 2, recommend_yes_pct: 50 },
];
const mine = { items: [], total: 0, page: 1, pageSize: 20, average: null };
const sent = {
  requested_at: '2026-10-03T09:00:00+00:00',
  expires_at: '2026-10-10T09:00:00+00:00',
  replayed: false,
  message_status: 'queued',
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('feedback calls (R-FBK)', () => {
  it('reads the admin page with its paging, sort and filters in order', async () => {
    const page = { items: [], total: 0, page: 2, pageSize: 20 };
    const { client, apiFetch } = clientAnswering(page);
    const query = { page: 2, pageSize: 20, sort: 'rating', dir: 'desc', kind: 'trial' } as const;
    await expect(feedbackCalls(client).list(query)).resolves.toEqual(page);
    expect(apiFetch).toHaveBeenCalledWith(
      '/feedback?page=2&pageSize=20&sort=rating&dir=desc&kind=trial',
    );
  });

  it('reads the summary and my own rows', async () => {
    const { client, apiFetch } = clientAnswering(summary);
    await expect(feedbackCalls(client).summary()).resolves.toEqual(summary);
    expect(apiFetch).toHaveBeenCalledWith('/feedback/summary');
    const own = clientAnswering(mine);
    await expect(feedbackCalls(own.client).mine()).resolves.toEqual(mine);
    expect(own.apiFetch).toHaveBeenCalledWith('/teachers/me/feedback');
  });

  it('sends the request for one student of one lesson', async () => {
    const { client, apiSend } = clientAnswering(sent);
    await expect(
      feedbackCalls(client).request({ lessonId: 'l-7', studentId: 's-1' }),
    ).resolves.toEqual(sent);
    expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/l-7/feedback-request', {
      studentId: 's-1',
    });
  });

  it('throws bad_response for a summary without its count', async () => {
    const { client } = clientAnswering([{ teacher: { id: 't1', name: 'أبرار' }, avg_rating: 4 }]);
    const failure = await feedbackCalls(client)
      .summary()
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response', path: '/feedback/summary' } });
  });
});
