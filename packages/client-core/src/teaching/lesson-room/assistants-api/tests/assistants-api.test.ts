import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { assistantsApi } from '..';

const STUDENT = '00000000-0000-4000-8000-000000000001';
const PROFILE = '00000000-0000-4000-8000-000000000002';
const list = [{ profile_id: PROFILE, full_name: 'سارة' }];
const lesson = {
  lesson_id: 'L', starts_at: '2026-11-16T17:00:00.000Z', ends_at: '2026-11-16T17:30:00.000Z',
  status: 'scheduled', teacher_name: 'أبرار', student_names: ['ليلى'],
};
const day = { from: '2026-11-16T00:00:00.000Z', to: '2026-11-17T00:00:00.000Z' };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('assistantsApi (R-CLS)', () => {
  it('reads every assistant and a student\'s own', async () => {
    const { client, apiFetch } = clientAnswering(list);
    await expect(assistantsApi(client).all()).resolves.toEqual(list);
    await expect(assistantsApi(client).forStudent(STUDENT)).resolves.toEqual(list);
    expect(apiFetch.mock.calls).toEqual([['/assistants'], [`/students/${STUDENT}/assistants`]]);
  });

  it('reads the assistant\'s own lessons of one day', async () => {
    const { client, apiFetch } = clientAnswering([lesson]);
    await expect(assistantsApi(client).mine(day)).resolves.toEqual([lesson]);
    expect(apiFetch).toHaveBeenCalledWith(
      `/assistants/me/lessons?from=${encodeURIComponent(day.from)}&to=${encodeURIComponent(day.to)}`,
    );
  });

  it('assigns and removes, answering the new list', async () => {
    const { client, apiSend } = clientAnswering(list);
    const input = { studentId: STUDENT, profileId: PROFILE };
    await expect(assistantsApi(client).assign(input)).resolves.toEqual(list);
    await expect(assistantsApi(client).remove(input)).resolves.toEqual(list);
    expect(apiSend.mock.calls).toEqual([
      ['POST', `/students/${STUDENT}/assistants`, { profileId: PROFILE }],
      ['DELETE', `/students/${STUDENT}/assistants/${PROFILE}`, undefined],
    ]);
  });

  it('throws bad_response on a lesson in an unknown state', async () => {
    const { client } = clientAnswering([{ ...lesson, status: 'lost' }]);
    const failure = await assistantsApi(client).mine(day).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
