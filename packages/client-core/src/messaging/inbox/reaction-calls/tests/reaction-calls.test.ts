import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { messageReactionCalls } from '../reaction-calls';

const ID = 'b1111111-1111-4111-8111-111111111111';
const PHONE = '+966500000001';
const AT = '2026-11-27T09:30:00.000Z';
const MESSAGE = {
  id: ID,
  direction: 'inbound',
  status: 'read',
  phone_e164: PHONE,
  lead_id: null,
  guardian_id: null,
  lesson_id: null,
  template_key: null,
  template_params: null,
  body: 'نص',
  media_mime: null,
  media_url: null,
  reply_to_wa_id: null,
  reactions: { theirs: null, ours: '👍', ours_by: null },
  interactive_payload: null,
  error_code: null,
  error_text: null,
  attempts: 0,
  next_attempt_at: null,
  scheduled_for: null,
  sent_at: null,
  delivered_at: null,
  read_at: AT,
  sent_manually_at: null,
  created_at: AT,
  click_to_chat: null,
  lesson: null,
};
const RESULT = { message: MESSAGE, status: 'sent', error_code: null, error_text: null };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

describe('message reaction calls', () => {
  it('puts the emoji and the request id on the path of today and reads the answer', async () => {
    const { client, apiSend } = clientAnswering(RESULT);
    const body = { emoji: '👍', clientRequestId: ID };
    const answer = messageReactionCalls(client).react({ params: { phone: PHONE, id: ID }, body });
    await expect(answer).resolves.toEqual(RESULT);
    expect(apiSend.mock.calls).toEqual([
      ['PUT', `/threads/${encodeURIComponent(PHONE)}/messages/${ID}/reaction`, body],
    ]);
  });

  it('removes ours with a null emoji', async () => {
    const { client, apiSend } = clientAnswering(RESULT);
    const body = { emoji: null, clientRequestId: ID };
    await messageReactionCalls(client).react({ params: { phone: PHONE, id: ID }, body });
    expect(apiSend).toHaveBeenCalledWith('PUT', expect.any(String), body);
  });

  it('refuses an answer without the message', async () => {
    const { client } = clientAnswering({ ...RESULT, message: undefined });
    const body = { emoji: '👍', clientRequestId: ID };
    const answer = messageReactionCalls(client).react({ params: { phone: PHONE, id: ID }, body });
    await expect(answer).rejects.toBeInstanceOf(ApiError);
  });
});
