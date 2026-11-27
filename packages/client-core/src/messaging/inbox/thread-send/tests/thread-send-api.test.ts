import { aMessageView } from '@ab/shared/testing';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { threadSendCalls } from '../thread-send-api';

const ID = 'b1111111-1111-4111-8111-111111111111';
const PHONE = '+966500000001';
const CHAT = `/threads/${encodeURIComponent(PHONE)}`;

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

describe('chat text and template send calls', () => {
  it('sends a text on the path of today and reads whether it replayed', async () => {
    const sent = { ...aMessageView({ body: 'hello' }), replayed: false, same_request: false };
    const { client, apiSend } = clientAnswering(sent);
    const body = { text: 'hello', clientRequestId: ID };
    const answer = threadSendCalls(client).text({ params: { phone: PHONE }, body });
    await expect(answer).resolves.toEqual(sent);
    expect(apiSend.mock.calls).toEqual([['POST', `${CHAT}/text`, body]]);
  });

  it('sends a template on the path of today and reads the sent message', async () => {
    const sent = aMessageView({ template_key: 'lesson_reminder' });
    const { client, apiSend } = clientAnswering(sent);
    const body = { key: 'lesson_reminder', params: { '1': 'Ali' }, clientRequestId: ID };
    const answer = threadSendCalls(client).template({ params: { phone: PHONE }, body });
    await expect(answer).resolves.toEqual(sent);
    expect(apiSend.mock.calls).toEqual([['POST', `${CHAT}/template`, body]]);
  });

  it('refuses a text answer that does not say whether it replayed', async () => {
    const calls = threadSendCalls(clientAnswering(aMessageView()).client);
    const answer = calls.text({ params: { phone: PHONE }, body: { text: 'hello' } });
    await expect(answer).rejects.toBeInstanceOf(ApiError);
  });
});
