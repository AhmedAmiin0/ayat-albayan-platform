import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { publicFeedbackCalls } from './public-feedback-api';

const form = { teacherName: 'أبرار', kind: 'trial', contactPhone: '', alreadySubmitted: false };
const answer = { rating: 5, recommend: 'yes', note: 'جزاكم الله خيرًا' } as const;

const clientAnswering = (reply: unknown) => {
  const apiFetch = vi.fn(async () => reply);
  const apiSend = vi.fn(async () => reply);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('public feedback calls (R-FBK, no login)', () => {
  it('reads the form of one link, its token encoded in the path', async () => {
    const { client, apiFetch } = clientAnswering(form);
    await expect(publicFeedbackCalls(client).form('tok/1.sig')).resolves.toEqual(form);
    expect(apiFetch).toHaveBeenCalledWith('/public/feedback/tok%2F1.sig');
  });

  it('sends the answer to the same link', async () => {
    const { client, apiSend } = clientAnswering({ submitted: true });
    await expect(publicFeedbackCalls(client).submit('tok.sig', answer)).resolves.toEqual({
      submitted: true,
    });
    expect(apiSend).toHaveBeenCalledWith('POST', '/public/feedback/tok.sig', answer);
  });

  it('throws bad_response for a form without the teacher', async () => {
    const { client } = clientAnswering({ kind: 'trial' });
    const failure = await publicFeedbackCalls(client)
      .form('tok')
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response', path: '/public/feedback/tok' } });
  });
});
