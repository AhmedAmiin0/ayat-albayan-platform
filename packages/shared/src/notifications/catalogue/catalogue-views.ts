import type { NotificationAudience } from './catalogue.types';

// GET /admin/notifications (docs/23 §3 phase 1): the catalogue with each row's effective state,
// computed from today's settings, the send gate and the template registry. Read-only.

/** The catalogue's tabs: one audience, or manual (every manual row). */
export type AudienceTab = NotificationAudience | 'manual';

/** Why a row would not go out now, in the order they are checked (the first one is shown). */
export const NOTIFICATION_BLOCKERS = [
  'not_configured',
  'messaging_off',
  'auto_off',
  'row_off',
  'template_not_approved',
  // v2 only (tagged clients; the frozen v1 shape maps it to row_off): lesson_join_link while the academy
  // classroom is not in use (LiveKit not configured, or no lesson uses the classroom). PR #134 item 8.
  'classroom_off',
] as const;
