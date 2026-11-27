import { describe, expect, it } from 'vitest';
import { messageViewSchema } from '../message-view.schemas';

const ID = '00000000-0000-4000-8000-000000000001';
const AT = '2026-11-27T09:30:00.123456+00:00';

const VIEW = {
  id: ID,
  direction: 'outbound',
  status: 'sent',
  phone_e164: '+966500000001',
  lead_id: null,
  guardian_id: ID,
  lesson_id: null,
  template_key: 'lesson_reminder',
  template_params: { '1': 'أحمد', button: 'abc', crm: { body: ['x'] } },
  template: {
    header: { type: 'text', text: 'تذكير' },
    footer: null,
    buttons: [{ type: 'url', text: 'ادخل', url: 'https://meet.test/abc' }],
  },
  body: 'نص',
  media_mime: null,
  media_url: null,
  media_name: null,
  reply_to_wa_id: null,
  reply_to_message_id: null,
  reply_to: null,
  replyable: true,
  forwardable: false,
  forwarded: false,
  reactions: { theirs: '👍', ours: null, ours_by: null },
  interactive_payload: { type: 'button', any: [1, 2] },
  error_code: null,
  error_text: null,
  attempts: 1,
  next_attempt_at: null,
  scheduled_for: null,
  sent_at: AT,
  delivered_at: null,
  read_at: null,
  sent_manually_at: null,
  app_send_until: null,
  sent_by_teacher_name: null,
  sender_name: 'مشرف',
  automatic: false,
  created_at: AT,
  click_to_chat: null,
  lesson: { starts_at: AT, ends_at: AT, status: 'scheduled' },
  line: 'chat',
};

describe('messageViewSchema', () => {
  it('reads a full view back unchanged, payload and template params included', () => {
    expect(messageViewSchema.parse(VIEW)).toEqual(VIEW);
  });

  it('keeps an old cache row without the optional fields as it is', () => {
    const { replyable, forwardable, reactions, line, automatic, sender_name, ...old } = VIEW;
    expect([replyable, forwardable, reactions, line, automatic, sender_name]).toHaveLength(6);
    expect(messageViewSchema.parse(old)).toEqual(old);
  });

  it('reads a quote, the unavailable marker, a hidden mark and a correction', () => {
    const quote = {
      id: ID,
      direction: 'inbound',
      body: null,
      media_mime: 'image/jpeg',
      template_key: null,
      sender_name: null,
    };
    const marks = { hidden: { by_name: null, at: AT }, corrects_id: ID, sent_by_id: ID };
    for (const reply_to of [quote, { unavailable: true }]) {
      const view = { ...VIEW, ...marks, edited: true, deleted: false, reply_to };
      expect(messageViewSchema.parse(view)).toEqual(view);
    }
  });

  it('refuses a missing id, an unknown status, a bad instant and a non-integer attempt count', () => {
    const { id, ...noId } = VIEW;
    expect(id).toBe(ID);
    for (const bad of [
      noId,
      { ...VIEW, status: 'lost' },
      { ...VIEW, created_at: '27/11/2026' },
      { ...VIEW, attempts: 1.5 },
      { ...VIEW, reply_to: { unavailable: false } },
    ]) {
      expect(messageViewSchema.safeParse(bad).success).toBe(false);
    }
  });
});
