import type { NotificationEntry } from './catalogue.types.js';

// Sends a person starts (docs/23a §B2 W8, W15–W19: listed, never switched) and the staff's bell /
// push kinds (§B3 P1–P8: always on today).

const MANUAL = { channels: ['whatsapp'], automatic: false, manual: true, essential: false, locked: false, defaults: { enabled: true } } as const;
const STAFF = { channels: ['bell', 'push'], templates: [], automatic: false, manual: false, essential: false, locked: false, defaults: { enabled: true } } as const;

export const MANUAL_ENTRIES = [
  { ...MANUAL, key: 'lesson_join_link_manual', audience: 'guardian', templates: ['lesson_join_link'] },
  { ...MANUAL, key: 'lesson_rating_manual', audience: 'guardian', templates: ['lesson_rating'] },
  { ...MANUAL, key: 'lesson_feedback_request', audience: 'guardian', templates: ['lesson_feedback_request'] },
  // W17: any template the sender may pick in the inbox (restricted roles see the starters only).
  { ...MANUAL, key: 'inbox_templates', audience: 'lead', templates: [] },
  // W18–W19: free text inside the 24-hour window, never a template.
  { ...MANUAL, key: 'meeting_invite_text', audience: 'guardian', templates: [] },
  { ...MANUAL, key: 'meeting_cancel_text', audience: 'guardian', templates: [] },
] as const satisfies readonly NotificationEntry[];

export const PUSH_ENTRIES = [
  { ...STAFF, key: 'new_lead', audience: 'staff', pushKind: 'new_lead' },
  { ...STAFF, key: 'new_message', audience: 'staff', pushKind: 'new_message' },
  // P3 runs even while automatic messages are off.
  { ...STAFF, key: 'lesson_needs_confirmation', audience: 'staff', pushKind: 'lesson_needs_confirmation', timing: 'reminder_minutes_before' },
  { ...STAFF, key: 'report_submitted', audience: 'staff', pushKind: 'report_submitted' },
  { ...STAFF, key: 'payment_due', audience: 'staff', pushKind: 'payment_due', timing: 'renewal_alert_remaining' },
  { ...STAFF, key: 'reminder_failed', audience: 'staff', pushKind: 'reminder_failed', locked: true },
  { ...STAFF, key: 'new_student', audience: 'teacher', pushKind: 'new_student' },
  { ...STAFF, key: 'meeting_invite', audience: 'staff', pushKind: 'meeting_invite' },
] as const satisfies readonly NotificationEntry[];
