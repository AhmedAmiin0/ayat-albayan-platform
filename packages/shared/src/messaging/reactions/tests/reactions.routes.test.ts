import { describe, expect, it } from 'vitest';
import { messageReactionRoutes as routes } from '..';

const ID = '00000000-0000-4000-8000-000000000001';
const AT = '2026-11-27T09:30:00.000Z';
const MESSAGE = {
  id: ID,
  direction: 'inbound',
  status: 'read',
  phone_e164: '+966500000001',
  lead_id: null,
  guardian_id: null,
  lesson_id: null,
  template_key: null,
  template_params: null,
  body: 'السلام عليكم',
  media_mime: null,
  media_url: null,
  reply_to_wa_id: null,
  reactions: { theirs: null, ours: '👍', ours_by: 'مشرف' },
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

describe('messageReactionRoutes', () => {
  it('keeps the path of today, with the inbox.send permission and the inbox tag', () => {
    expect(`${routes.react.method} ${routes.react.path}`).toBe(
      'PUT /threads/:phone/messages/:id/reaction',
    );
    expect(routes.react.permissions).toEqual(['inbox.send']);
    expect(routes.react.tags).toEqual(['inbox']);
  });

  it('reads any spelling of the phone and refuses a bad phone or a non-uuid id', () => {
    const { params } = routes.react;
    expect(params.parse({ phone: '966500000001', id: ID })).toEqual({
      phone: '+966500000001',
      id: ID,
    });
    expect(params.safeParse({ phone: 'abc', id: ID }).success).toBe(false);
    expect(params.safeParse({ phone: '+966500000001', id: 'm1' }).success).toBe(false);
  });

  it('takes an emoji or null with a request id, never text', () => {
    const body = { emoji: '❤️', clientRequestId: ID };
    expect(routes.react.body.parse(body)).toEqual(body);
    expect(routes.react.body.safeParse({ ...body, emoji: 'ok' }).success).toBe(false);
  });

  it('answers the message as it is now and how the send went', () => {
    expect(routes.react.response.parse(RESULT)).toEqual(RESULT);
    const failed = { ...RESULT, status: 'failed', error_code: '131047', error_text: 'window' };
    expect(routes.react.response.parse(failed)).toEqual(failed);
    expect(routes.react.response.safeParse({ ...RESULT, status: 'gone' }).success).toBe(false);
    expect(routes.react.response.safeParse({ ...RESULT, message: null }).success).toBe(false);
  });
});
