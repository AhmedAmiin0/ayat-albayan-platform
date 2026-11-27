import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { threadForwardCalls } from '../thread-forward-api';

const ID = 'b1111111-1111-4111-8111-111111111111';
const REQ = 'c1111111-1111-4111-8111-111111111111';
const BODY = { messageId: ID, targets: ['+201000000001', '+201000000002'], clientRequestId: REQ };
const ANSWER = {
  results: [
    { phone: '+201000000001', sent: true, message_id: ID },
    { phone: '+201000000002', sent: false, reason: 'session_closed' },
  ],
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

describe('thread forward calls', () => {
  it('posts the forward on the path of today and answers each target', async () => {
    const { client, apiSend } = clientAnswering(ANSWER);
    await expect(threadForwardCalls(client).forward(BODY)).resolves.toEqual(ANSWER);
    expect(apiSend.mock.calls).toEqual([['POST', '/threads/forward', BODY]]);
  });

  it('refuses an answer whose skip reason it does not know', async () => {
    const odd = { results: [{ phone: '+201000000001', sent: false, reason: 'busy' }] };
    const { client } = clientAnswering(odd);
    await expect(threadForwardCalls(client).forward(BODY)).rejects.toBeInstanceOf(ApiError);
  });
});
