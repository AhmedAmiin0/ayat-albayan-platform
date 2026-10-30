import { vi } from 'vitest';
import type { MessageRow } from '../messages/message.mapper';
import type { DueMessage } from './sender.queries';

// Test-only (excluded from the build): queued outbound rows as the producers write them.

export function dueMessage(over: Partial<DueMessage> = {}): DueMessage {
  return {
    id: 'm0000000-0000-4000-8000-000000000001',
    phone_e164: '+966551234567',
    lead_id: null,
    lesson_id: 'l0000000-0000-4000-8000-000000000001',
    template_key: 'booking_confirmation',
    template_params: { '1': 'سلمى', '2': 'الأحد 4 أكتوبر 17:00', button: 'ab-sara-x1' },
    body: null,
    reply_to_wa_id: null,
    dedup_key: 'booking_confirmation:l1:g1',
    created_by: null,
    attempts: 0,
    expires_at: null,
    error_code: null,
    line: null,
    number_id: null,
    lesson: { starts_at: '2026-10-04T14:00:00+00:00', status: 'scheduled' },
    guardian: { name: 'أم سلمى' },
    lead: null,
    ...over,
  };
}

export function messageRow(over: Partial<MessageRow> = {}): MessageRow {
  const due = dueMessage();
  return {
    id: due.id, direction: 'outbound', channel: 'whatsapp', status: 'queued', phone_e164: due.phone_e164,
    lead_id: null, guardian_id: 'g0000000-0000-4000-8000-000000000001', lesson_id: due.lesson_id,
    template_key: due.template_key, template_params: due.template_params, body: null, wa_message_id: null,
    error_code: null, error_text: null, dedup_key: due.dedup_key, scheduled_for: '2026-10-02T08:00:00Z',
    sent_at: null, delivered_at: null, read_at: null, created_at: '2026-10-02T08:00:00Z', created_by: null,
    attempts: 0, next_attempt_at: null, expires_at: null, sent_manually_at: null, reply_to_wa_id: null,
    media_id: null, media_mime: null, media_path: null, media_name: null, media_pages: null, media_bytes: null,
    interactive_payload: null, wa_conversation_id: null,
    wa_pricing_category: null, sent_by_teacher_id: null, line: null, number_id: null, reply_to_message_id: null, forwarded_from_id: null,
    their_reaction: null, our_reaction: null, our_reaction_by: null, our_reaction_at: null,
    ...over,
  };
}

/** A SendGate stand-in: mock open() / automaticOn(); switches() answers both from them, as the real one does from one read. */
export function fakeSwitches() {
  const open = vi.fn<() => Promise<boolean>>();
  const automaticOn = vi.fn<() => Promise<boolean>>();
  const switches = async () => ({ open: await open(), automaticOn: await automaticOn() });
  return { open, automaticOn, switches };
}
