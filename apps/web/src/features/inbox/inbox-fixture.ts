import type { MessageView, TemplateView, ThreadDetail, ThreadView } from '@ab/shared';
import type { InboxLead } from './api';

// Test rows shaped like the Phase 4 API (docs/12 §4). Not imported by app code.

export const PHONE = '+966501234567';

export function thread(patch: Partial<ThreadView> = {}): ThreadView {
  return {
    phone_e164: PHONE,
    display_name: 'أم سهيلة',
    last_message_id: 'm-in',
    last_direction: 'inbound',
    last_body: 'السلام عليكم',
    last_template_key: null,
    last_status: 'delivered',
    last_media_mime: null,
    last_message_at: '2026-10-01T10:00:00Z',
    last_inbound_at: '2026-10-01T10:00:00Z',
    unread_count: 0,
    lead_id: 'lead-1',
    lead_name: 'أم سهيلة',
    lead_status: 'new',
    lead_source: 'facebook_ad',
    guardian_id: null,
    guardian_name: null,
    guardian_tz: null,
    teacher_id: null,
    teacher_name: null,
    session_open: true,
    ...patch,
  };
}

export function message(patch: Partial<MessageView> = {}): MessageView {
  return {
    id: 'm-in',
    direction: 'inbound',
    status: 'delivered',
    phone_e164: PHONE,
    lead_id: 'lead-1',
    guardian_id: null,
    lesson_id: null,
    template_key: null,
    template_params: null,
    body: 'السلام عليكم',
    media_mime: null,
    media_url: null,
    reply_to_wa_id: null,
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
    created_at: '2026-10-01T10:00:00Z',
    click_to_chat: null,
    lesson: null,
    ...patch,
  };
}

export const detail = (messages: MessageView[], patch: Partial<ThreadView> = {}): ThreadDetail => ({
  thread: thread(patch),
  messages,
  has_more: false,
  lessons: [],
});

export function template(patch: Partial<TemplateView> = {}): TemplateView {
  return {
    key: 'booking_confirmation_plain',
    meta_name: 'booking_confirmation_plain',
    language: 'ar',
    category: 'utility',
    header_format: null,
    body_ar: 'تم حجز حلقة {{1}} يوم {{2}}',
    footer_ar: 'أكاديمية آيات البيان',
    params: ['student_names', 'lesson_when'],
    buttons: [],
    status: 'approved',
    quality: 'GREEN',
    meta_id: 'meta-1',
    last_checked_at: '2026-10-01T09:00:00Z',
    last_error: null,
    submitted_at: null,
    ...patch,
  };
}

export function lead(patch: Partial<InboxLead> = {}): InboxLead {
  return {
    id: 'lead-1',
    phone_e164: PHONE,
    name: 'أم سهيلة',
    source: 'facebook_ad',
    status: 'new',
    last_inbound_at: '2026-10-01T10:00:00Z',
    last_outbound_at: null,
    created_at: '2026-09-30T10:00:00Z',
    qualification: {},
    tz: null,
    follow_up_paused: false,
    follow_up_stage: 0,
    next_follow_up_at: null,
    follow_up_note: null,
    follow_up_paused_by: null,
    updated_at: '2026-10-01T10:00:00Z',
    ...patch,
  };
}
