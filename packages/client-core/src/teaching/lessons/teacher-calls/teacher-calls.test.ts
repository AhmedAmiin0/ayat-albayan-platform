import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { teacherLessonCalls } from '.';

const LESSON = '00000000-0000-4000-8000-000000000001';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async (_path: string) => answer);
  const apiSend = vi.fn(async (_m: string, _path: string, _body?: unknown) => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

describe('teacherLessonCalls (docs/46 C3, C4)', () => {
  it('cancels her own lesson by its id with the reason as the body', async () => {
    const { client, apiSend } = clientAnswering({ id: LESSON });
    const body = { reason: 'سفر' };
    await expect(teacherLessonCalls(client).cancel({ id: LESSON }, body)).rejects.toThrow(ApiError);
    expect(apiSend).toHaveBeenCalledWith('POST', `/teachers/me/lessons/${LESSON}/cancel`, body);
  });

  it('confirms her attendance without a body', async () => {
    const { client, apiSend } = clientAnswering(null);
    await expect(teacherLessonCalls(client).confirm({ id: LESSON })).rejects.toThrow(ApiError);
    const path = `/teachers/me/lessons/${LESSON}/confirm-attendance`;
    expect(apiSend).toHaveBeenCalledWith('POST', path, undefined);
  });

});
