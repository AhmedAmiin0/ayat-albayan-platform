import type { TemplateView } from '../../messaging/templates/catalog/template-view.schemas';

const ID = '6f1c2a40-0b7e-4c2f-9d1a-3e5b7c9d1f20';

/** One registry row as the api answers it, every optional part filled. */
export const aTemplateView = (patch: Partial<TemplateView> = {}): TemplateView => ({
  key: 'lesson_reminder',
  meta_name: 'lesson_reminder_v2',
  language: 'ar',
  category: 'utility',
  header_format: null,
  body_ar: 'تذكير بحلقة {{1}}',
  footer_ar: null,
  params: ['student_name'],
  buttons: [{ type: 'quick_reply', text: 'تأكيد', intent: 'confirm' }],
  display: { header: { type: 'text', text: 'تذكير' }, buttons: [{ type: 'quick_reply', text: 'تأكيد' }] },
  status: 'approved',
  quality: 'GREEN',
  meta_id: '123',
  last_checked_at: '2026-11-27T10:00:00+00:00',
  last_error: null,
  submitted_at: '2026-11-26T10:00:00.123+00:00',
  line: 'notifications',
  sales_starter: false,
  number_id: ID,
  numbers: [{ number_id: ID, status: 'approved', last_checked_at: null, last_error: null }],
  crm_name: null,
  crm_language: null,
  created_by: null,
  approved_edits: ['2026-11-20T10:00:00+00:00'],
  ...patch,
});
