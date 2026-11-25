import type { NotificationEntry } from './catalogue.types';

// The family app's own pushes (docs/50 §5 item 6): to the guardian and the student logins only,
// in their bell and on their devices. No WhatsApp (that stays the report PDF and the reminders).
// On by default; the admin turns either off, or keeps its bell row only, on today's rule screen.

const FAMILY = {
  audience: 'guardian',
  channels: ['bell', 'push'],
  templates: [],
  automatic: false,
  manual: false,
  essential: false,
  locked: false,
  defaults: { enabled: true },
} as const;

export const FAMILY_ENTRIES = [
  // The lesson's join window opened (settings.join_opens_before_min).
  { ...FAMILY, key: 'lesson_starting', pushKind: 'lesson_starting' },
  // The lesson report reached the family (lesson_reports.sent_at stamped).
  { ...FAMILY, key: 'report_sent', pushKind: 'report_sent' },
  // The teacher entered the room; the push opens the room straight in.
  { ...FAMILY, key: 'lesson_live', pushKind: 'lesson_live' },
  // Staff declined the family's move request: the lesson stays as it was.
  { ...FAMILY, key: 'lesson_request_declined', pushKind: 'lesson_request_declined' },
] as const satisfies readonly NotificationEntry[];
