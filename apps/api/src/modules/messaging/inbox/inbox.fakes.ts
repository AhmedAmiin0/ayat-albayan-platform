// Test fixtures for the inbox (test-only, excluded from the build by the *.fakes.ts pattern).
import type { ThreadStudentView } from '@ab/shared';
import type { ThreadRow } from './threads/threads.mapper';

export const PHONE = '+966501234567';

/**
 * A v_threads row. Its newest inbound counts as the notifications line's (history / single line)
 * unless `over` sets the per-line columns, so `last_inbound_at` alone still opens the window.
 */
export function threadRow(over: Partial<ThreadRow> = {}): ThreadRow {
  const inboundAt = over.last_inbound_at === undefined ? '2026-10-02T08:00:00Z' : over.last_inbound_at;
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
    last_inbound_line: null,
    last_chat_inbound_at: null,
    last_notifications_inbound_at: inboundAt,
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

/** A child on an unpaid package that is still running (3 lessons left, 190 owed). */
export function threadStudent(over: Partial<ThreadStudentView> = {}): ThreadStudentView {
  return {
    id: 's1',
    name: 'ياسمين',
    code: 'AB-0101',
    teacher_name: 'أبرار',
    status: 'active',
    subscription: {
      id: 'sub-1',
      status: 'unpaid',
      package_size: '8',
      lessons_total: 8,
      lessons_used: 5,
      lessons_remaining: 3,
      price: 290,
      currency: 'SAR',
      paid_amount: 100,
      due_amount: 190,
      renews_on: null,
      starts_on: '2026-09-01',
    },
    ...over,
  };
}
