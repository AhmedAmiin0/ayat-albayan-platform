import type { MessageView } from '../../messaging';

const AT = '2026-11-27T09:30:00.000Z';

/** A staff text sent from a chat, as a message view answers it; override what a test needs. */
export const aMessageView = (overrides: Partial<MessageView> = {}): MessageView => ({
  id: 'b1111111-1111-4111-8111-111111111111',
  direction: 'outbound',
  status: 'queued',
  phone_e164: '+966500000001',
  lead_id: null,
  guardian_id: null,
  lesson_id: null,
  template_key: null,
  template_params: null,
  body: null,
  media_mime: null,
  media_url: null,
  reply_to_wa_id: null,
  reactions: { theirs: null, ours: null, ours_by: null },
  interactive_payload: null,
  error_code: null,
  error_text: null,
  attempts: 0,
  next_attempt_at: null,
  scheduled_for: null,
  sent_at: null,
  delivered_at: null,
  read_at: null,
  sent_manually_at: null,
  created_at: AT,
  click_to_chat: null,
  lesson: null,
  ...overrides,
});
