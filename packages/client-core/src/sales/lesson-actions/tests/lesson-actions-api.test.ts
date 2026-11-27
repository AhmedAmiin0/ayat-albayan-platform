import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../core/http';
import { salesLessonActionCalls } from '../lesson-actions-api';

const ID = '11111111-1111-4111-8111-111111111111';
const AT = '2026-11-01T15:00:00.000Z';
const BASE = `/sales/lessons/${ID}`;

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

const failureOf = (p: Promise<unknown>) => p.catch((e: unknown) => e);

describe('the lesson actions of a salesperson', () => {
  it('moves one lesson on the path of today and reads the new time', async () => {
    const moved = { id: ID, starts_at: AT, status: 'scheduled' };
    const { client, apiSend } = clientAnswering(moved);
    const body = { startsAt: AT, reason: 'سفر' };
    const calls = salesLessonActionCalls(client);
    await expect(calls.reschedule({ lessonId: ID, body })).resolves.toEqual(moved);
    expect(apiSend).toHaveBeenCalledWith('POST', `${BASE}/reschedule`, body);
  });

  it('confirms with no body', async () => {
    const { client, apiSend } = clientAnswering({ id: ID, starts_at: AT, status: 'confirmed' });
    await salesLessonActionCalls(client).confirm(ID);
    expect(apiSend).toHaveBeenCalledWith('POST', `${BASE}/confirm`, undefined);
  });

  it('cancels and corrects, reading the lesson and its status', async () => {
    const { client, apiSend } = clientAnswering({ id: ID, status: 'no_show' });
    const calls = salesLessonActionCalls(client);
    await calls.cancel({ lessonId: ID, body: { by: 'teacher' } });
    expect(apiSend).toHaveBeenCalledWith('POST', `${BASE}/cancel`, { by: 'teacher' });
    await calls.correct({ lessonId: ID, body: { to: 'no_show' } });
    expect(apiSend).toHaveBeenCalledWith('POST', `${BASE}/correct`, { to: 'no_show' });
  });

  it('throws bad_response for a status outside the list', async () => {
    const { client } = clientAnswering({ id: ID, status: 'gone' });
    const calls = salesLessonActionCalls(client);
    const failure = await failureOf(calls.cancel({ lessonId: ID, body: {} }));
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
