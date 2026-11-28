import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { coursePauseCalls } from './course-pause-api';

const STUDENT = 'e1111111-1111-4111-8111-111111111111';
const SUB = 'e2222222-2222-4222-8222-222222222222';
const BASE = `/students/${STUDENT}/course-pause`;
const VIEW = {
  id: 'e3333333-3333-4333-8333-333333333333',
  from_date: '2026-12-01',
  until_date: null,
  reason: null,
  created_at: '2026-11-27T10:00:00.000+00:00',
  created_by_name: null,
  resumed_at: null,
  extended_days: null,
};
const RESULT = { pause: VIEW, cancelled: 1, left: 0, reopened: 0, conflicts: 0 };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('course pause calls', () => {
  it('reads the state and the resume preview of the student', async () => {
    const { client, apiFetch } = clientAnswering({ open: VIEW, history: [] });
    await expect(coursePauseCalls(client).state(STUDENT)).resolves.toEqual({
      open: VIEW,
      history: [],
    });
    expect(apiFetch).toHaveBeenCalledWith(BASE);
    const back = clientAnswering({ back: [], extendDays: 0 });
    await coursePauseCalls(back.client).resumePreview(STUDENT);
    expect(back.apiFetch).toHaveBeenCalledWith(`${BASE}/resume-preview`);
  });

  it('previews a window, an open-ended one without an until', async () => {
    const preview = { from_date: '2026-12-01', until_date: null, lessons: 0 };
    const { client, apiFetch } = clientAnswering(preview);
    const calls = coursePauseCalls(client);
    await calls.preview({ studentId: STUDENT, from: '2026-12-01', until: null });
    expect(apiFetch).toHaveBeenCalledWith(`${BASE}/preview?from=2026-12-01`);
    await calls.preview({ studentId: STUDENT, from: '2026-12-01', until: '2026-12-10' });
    expect(apiFetch).toHaveBeenLastCalledWith(`${BASE}/preview?from=2026-12-01&until=2026-12-10`);
  });

  it('sends the start, the until change and both resumes as before', async () => {
    const { client, apiSend } = clientAnswering(RESULT);
    const calls = coursePauseCalls(client);
    await expect(calls.start(STUDENT, { untilDate: null })).resolves.toEqual(RESULT);
    expect(apiSend).toHaveBeenCalledWith('POST', BASE, { untilDate: null });
    await calls.until(STUDENT, '2026-12-10');
    expect(apiSend).toHaveBeenCalledWith('PATCH', `${BASE}/until`, { untilDate: '2026-12-10' });
    await calls.resume(STUDENT, SUB);
    expect(apiSend).toHaveBeenCalledWith('POST', `${BASE}/resume`, { subscriptionId: SUB });
    await calls.resume(STUDENT);
    expect(apiSend).toHaveBeenLastCalledWith('POST', `${BASE}/resume`, {});
  });

  it('throws bad_response for a write answer without its pause', async () => {
    const { pause: _p, ...noPause } = RESULT;
    const failure = await coursePauseCalls(clientAnswering(noPause).client)
      .resume(STUDENT)
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
