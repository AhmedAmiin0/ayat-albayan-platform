import { describe, expect, it } from 'vitest';
import { threadViewSchema } from '../thread-view.schemas';

const ID = 'c0000000-0000-4000-8000-000000000001';
const AT = '2026-10-02T08:00:00Z';
const VIEW = {
  phone_e164: '+966501234567',
  display_name: null,
  last_message_id: ID,
  last_direction: 'inbound',
  last_body: 'السلام عليكم',
  last_template_key: null,
  last_status: 'delivered',
  last_media_mime: null,
  last_message_at: AT,
  last_inbound_at: AT,
  unread_count: 1,
  lead_id: ID,
  lead_name: 'أم ياسمين',
  lead_status: 'new',
  lead_source: 'whatsapp_direct',
  guardian_id: null,
  guardian_name: null,
  guardian_tz: null,
  teacher_id: null,
  teacher_name: null,
  session_open: true,
  subscribed: false,
};

describe('threadViewSchema', () => {
  it('reads a chat row of an old cache, with no optional field', () => {
    expect(threadViewSchema.parse(VIEW)).toEqual(VIEW);
  });

  it('reads the ring, badge, lines, note and reopen fields when present', () => {
    const full = {
      ...VIEW,
      ring: 'renewal',
      badge: 'expired',
      unpaid: true,
      last_note: 'ad_welcome',
      last_unsupported: false,
      last_inbound_line: 'chat',
      reply_line: null,
      reactable: true,
      try_after_window: true,
      reopen_choice: 'wait',
      reopen_sent: { id: ID, template_key: 'chat_reopen', status: 'sent' },
      reopen_template: 'chat_reopen',
    };
    expect(threadViewSchema.parse(full)).toEqual(full);
  });

  it('drops a column the view does not declare', () => {
    expect(threadViewSchema.parse({ ...VIEW, last_activity_at: AT })).toEqual(VIEW);
  });

  it('refuses a phone that is no number, an unknown status and a negative unread count', () => {
    const bad = [
      { ...VIEW, phone_e164: 'unknown' },
      { ...VIEW, last_status: 'lost' },
      { ...VIEW, unread_count: -1 },
      { ...VIEW, ring: 'gold' },
    ];
    const read = bad.map((v) => threadViewSchema.safeParse(v).success);
    expect(read).toEqual([false, false, false, false]);
  });
});
