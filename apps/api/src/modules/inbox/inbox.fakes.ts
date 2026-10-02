// Test fixtures for the inbox (test-only, excluded from the build by the *.fakes.ts pattern).
import type { ThreadRow } from './threads.mapper';

export const PHONE = '+966501234567';

export function threadRow(over: Partial<ThreadRow> = {}): ThreadRow {
  return {
    phone_e164: PHONE,
    display_name: 'أم ياسمين',
    last_message_id: 'm0000000-0000-4000-8000-000000000001',
    last_direction: 'inbound',
    last_body: 'السلام عليكم',
    last_template_key: null,
    last_status: 'delivered',
    last_media_mime: null,
    last_message_at: '2026-10-02T08:00:00Z',
    last_inbound_at: '2026-10-02T08:00:00Z',
    unread_count: 1,
    lead_id: 'l0000000-0000-4000-8000-000000000001',
    lead_name: 'أم ياسمين',
    lead_status: 'new',
    lead_source: 'whatsapp_direct',
    guardian_id: null,
    guardian_name: null,
    guardian_tz: null,
    teacher_id: null,
    teacher_name: null,
    ...over,
  };
}
