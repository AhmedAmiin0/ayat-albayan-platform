import type { MessageView, TemplateView, ThreadDetail, ThreadPeople, ThreadView } from '@ab/shared';
import { provisionalMessage, type ThreadCache } from './thread-cache';

// Test rows in the GET /threads/:phone and GET /messaging/templates shapes (huda's test phone).

export const PHONE = '+966552147730';
export const NOW = new Date('2026-10-02T09:00:00Z');

export const thread: ThreadView = {
  phone_e164: PHONE,
  display_name: 'هدى سالم',
  last_message_id: 'm2',
  last_direction: 'outbound',
  last_body: 'أهلًا بيكي',
  last_template_key: null,
  last_status: 'delivered',
  last_media_mime: null,
  last_message_at: '2026-10-02T08:05:00Z',
  last_inbound_at: '2026-10-02T08:00:00Z',
  unread_count: 0,
  lead_id: 'a1',
  lead_name: 'هدى سالم',
  lead_status: 'new',
  lead_source: 'facebook_ad',
  guardian_id: null,
  guardian_name: null,
  guardian_tz: null,
  teacher_id: null,
  teacher_name: null,
  session_open: true,
  subscribed: false,
};

/** An API row: the provisional shape with the server's fields over it. */
export function message(fields: Partial<MessageView> & { id: string }): MessageView {
  return { ...provisionalMessage({ id: fields.id, phone: PHONE, body: '' }), ...fields };
}

export const inbound = message({
  id: 'm1',
  direction: 'inbound',
  status: 'delivered',
  body: 'السلام عليكم، عايزة أسجّل بنتي',
  created_at: '2026-10-02T08:00:00Z',
});

export const delivered = message({
  id: 'm2',
  body: 'أهلًا بيكي',
  status: 'delivered',
  sent_at: '2026-10-02T08:05:00Z',
  delivered_at: '2026-10-02T08:05:10Z',
  created_at: '2026-10-02T08:05:00Z',
});

export const failed = message({
  id: 'm3',
  body: 'حلقة سهيلة النهاردة — 17:00',
  template_key: 'lesson_reminder_plain',
  status: 'failed',
  error_code: '131049',
  attempts: 1,
  created_at: '2026-10-02T08:10:00Z',
  click_to_chat: 'https://wa.me/966552147730?text=x',
});

/** A thread with nobody on file: no guardian, no lead row, no students. */
export const noPeople: ThreadPeople = { guardian: null, lead: null, students: [] };

export function detail(messages: MessageView[], fields: Partial<ThreadDetail> = {}): ThreadDetail {
  return { thread, messages, has_more: false, lessons: [], people: noPeople, ...fields };
}

/** A cached thread, as useThread stores it. */
export function cachedThread(...pages: ThreadDetail[]): ThreadCache {
  return { pages, pageParams: pages.map((p, i) => (i === 0 ? undefined : p.messages[0]?.created_at)) };
}

export const plainReminder: TemplateView = {
  key: 'lesson_reminder_plain',
  meta_name: 'lesson_reminder_plain',
  language: 'ar',
  category: 'utility',
  header_format: null,
  body_ar: 'حلقة {{1}} النهاردة — {{2}}',
  footer_ar: 'أكاديمية آيات البيان',
  params: ['student_names', 'lesson_time'],
  buttons: [],
  status: 'approved',
  quality: 'GREEN',
  meta_id: '1',
  last_checked_at: null,
  last_error: null,
  submitted_at: null,
  line: 'notifications',
  sales_starter: false,
};

export const meetReminder: TemplateView = {
  ...plainReminder,
  key: 'lesson_reminder_meet',
  meta_name: 'lesson_reminder_meet',
  buttons: [{ type: 'url', url: 'https://meet.google.com/{{1}}' }],
};

export const notApproved: TemplateView = {
  ...plainReminder,
  key: 'renewal_due',
  meta_name: 'renewal_due',
  status: 'not_submitted',
};
