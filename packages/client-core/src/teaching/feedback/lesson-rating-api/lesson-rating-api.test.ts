import { aMessageView } from '@ab/shared/testing';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { lessonRatingCalls } from './lesson-rating-api';

const PHONE = '+966500000001';
const REQ = '5f0c2c4e-1b2a-4c3d-9e8f-0a1b2c3d4e5f';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

describe('lesson rating calls (R-FBK)', () => {
  it('posts the request id on the path of today and reads the queued message', async () => {
    const sent = aMessageView({ template_key: 'lesson_rating' });
    const { client, apiSend } = clientAnswering(sent);
    const body = { clientRequestId: REQ };
    await expect(lessonRatingCalls(client).send({ phone: PHONE }, body)).resolves.toEqual(sent);
    expect(apiSend.mock.calls).toEqual([
      ['POST', `/threads/${encodeURIComponent(PHONE)}/rating`, body],
    ]);
  });

  it('refuses an answer that is no message', async () => {
    const calls = lessonRatingCalls(clientAnswering({ id: 'msg1' }).client);
    const answer = calls.send({ phone: PHONE }, { clientRequestId: REQ });
    await expect(answer).rejects.toBeInstanceOf(ApiError);
  });
});
