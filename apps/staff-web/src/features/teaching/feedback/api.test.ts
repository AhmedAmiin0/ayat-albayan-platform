import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@ab/web-kit';
import { ROW_DONE } from './feedback-fixture';
import { feedbackListQuery, myFeedbackQuery, publicProblem } from './api';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const state = {
  page: 2,
  sort: { sort: 'rating', dir: 'desc' },
  filters: { kind: 'trial' },
} as const;
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('feedback lists through their routes (R-FBK, R-NFR-08)', () => {
  afterEach(() => apiFetch.mockReset());

  it('reads the admin page with its paging, sort and filters in order', async () => {
    const page = { items: [ROW_DONE], total: 1, page: 2, pageSize: 20 };
    apiFetch.mockResolvedValue(page);
    await expect(client().query(feedbackListQuery(state))).resolves.toEqual(page);
    expect(apiFetch).toHaveBeenCalledWith(
      '/feedback?page=2&pageSize=20&sort=rating&dir=desc&kind=trial',
    );
  });

  it('reads my own rows without the teacher block or the contact phone', async () => {
    const own = { items: [ROW_DONE], total: 1, page: 2, pageSize: 20, average: null };
    apiFetch.mockResolvedValue(own);
    const view = await client().query(myFeedbackQuery(state));
    expect(view.items[0]).not.toHaveProperty('contact_phone');
    expect(apiFetch).toHaveBeenCalledWith(
      '/teachers/me/feedback?page=2&pageSize=20&sort=rating&dir=desc&kind=trial',
    );
  });

  it('rejects an admin page without its total as a bad answer', async () => {
    apiFetch.mockResolvedValue({ items: [], page: 1, pageSize: 20 });
    const failure = await client()
      .query(feedbackListQuery(state))
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});

describe('public feedback contract', () => {
  it('a form the page cannot read is a failure to retry later, not a bad link', () => {
    const unreadable = new ApiError(200, { code: 'bad_response', path: '/public/feedback/tok' });
    expect(publicProblem(unreadable)).toBe('failed');
  });

  it('publicProblem: 409 already, 429 too many, other 4xx a bad link, the rest a failure to retry', () => {
    expect(publicProblem(new ApiError(409))).toBe('already');
    expect(publicProblem(new ApiError(429))).toBe('too_many');
    expect(publicProblem(new ApiError(404))).toBe('invalid');
    expect(publicProblem(new ApiError(401))).toBe('invalid');
    expect(publicProblem(new ApiError(500))).toBe('failed');
    expect(publicProblem(new TypeError('network'))).toBe('failed');
  });
});
