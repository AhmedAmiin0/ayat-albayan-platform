import type { InstantLessonRequest } from '@ab/schedule';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { instantLessonCall } from './instant-lesson-api';

const body: InstantLessonRequest = { studentIds: ['s-1'], teacherId: 't-1', durationMin: 30 };

const clientAnswering = (answer: unknown) => {
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch: vi.fn(), apiSend };
  return { client, apiSend };
};

describe('instantLessonCall (R-MEET-01)', () => {
  it('POSTs the request and answers the lesson id', async () => {
    const { client, apiSend } = clientAnswering({ lessonId: 'l-9' });
    await expect(instantLessonCall(client)(body)).resolves.toEqual({ lessonId: 'l-9' });
    expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/instant', body);
  });

  it('throws bad_response for an answer without the lesson id', async () => {
    const { client } = clientAnswering({});
    const failure = await instantLessonCall(client)(body).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
