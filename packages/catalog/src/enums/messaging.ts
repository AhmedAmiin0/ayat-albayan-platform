// Phase 4 enums (migrations 072, 140–143): WhatsApp messages, the template registry, admin pushes.
// Each mirrors a DB enum; the api's enum-parity tests catch drift.
export const MESSAGE_DIRECTIONS = [
  'inbound',
  'outbound',
] as const;
export const MESSAGE_STATUSES = [
  'queued',
  'sent',
  'delivered',
  'read',
  'failed',
  'sent_manually',
] as const;
export const TEMPLATE_STATUSES = [
  'not_submitted',
  'pending',
  'approved',
  'rejected',
  'paused',
  'disabled',
  'missing',
] as const;
export const TEMPLATE_CATEGORIES = [
  'utility',
  'marketing',
  'authentication',
] as const;
/**
 * R-MOB-01's five events plus new_message (mobile.pushRationale promises «رسالة جديدة»), and the bell's
 * new_student (a teacher's new booking, R-NOT-03) and meeting_invite (an internal meeting, R-NOT-01),
 * and google_sync_alert (docs/24: the Google link expired or a teacher has no calendar; bell only, admins),
 * channel_message (docs/31 §2: a family's message in a student channel, to the current teacher) and
 * commission_earned («عمولة جديدة» to the assistant who brought the student; bell only).
 * payment_received: a payment came in; the admins and the student's assistant.
 */
export const PUSH_KINDS = [
  'new_lead',
  'new_message',
  'lesson_needs_confirmation',
  'report_submitted',
  'reminder_failed',
  'payment_due',
  'new_student',
  'meeting_invite',
  'google_sync_alert',
  'channel_message',
  'commission_earned',
  'lesson_rescheduled',
  'lesson_cancelled',
  'course_paused',
  'course_resumed',
  'payment_received',
] as const;
/**
 * The family app's own kinds (docs/50 §5 item 6): a lesson's join window opened, its report was
 * sent to the family, the teacher entered its room (lesson_live, «بدأت الحلقة»),
 * staff declined the family's «اطلب موعدًا آخر». Kept apart from PUSH_KINDS, which the staff apps
 * map exhaustively.
 */
export const FAMILY_PUSH_KINDS = [
  'lesson_starting',
  'report_sent',
  'lesson_live',
  'lesson_request_declined',
] as const;
/** Every push_kind the API stores or sends: staff kinds, then family kinds. */
export const ALL_PUSH_KINDS = [
  ...PUSH_KINDS,
  ...FAMILY_PUSH_KINDS,
] as const;
/** The two business WhatsApp numbers (docs/12 §13): a template leaves from its registry line (§13.18). */
export const WA_LINES = ['notifications', 'chat'] as const;
/** Every wa_numbers purpose; `calls` never sends a regular message (docs/28 §10). */
export const NUMBER_PURPOSES = [
  ...WA_LINES,
  'calls',
] as const;

export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number];
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];
/** A staff kind (the staff apps' exhaustive maps); AnyPushKind for whatever is stored or sent. */
export type PushKind = (typeof PUSH_KINDS)[number];
export type FamilyPushKind = (typeof FAMILY_PUSH_KINDS)[number];
/** Any push_notifications.kind (the DB enum push_kind). */
export type AnyPushKind = (typeof ALL_PUSH_KINDS)[number];
/** A messaging line (sends and reply windows); never `calls` (docs/28 §10). */
export type WaLine = (typeof WA_LINES)[number];
/**
 * A wa_numbers role: a messaging line, or `calls` (a number that only carries WhatsApp calls,
 * docs/28 §10).
 */
export type NumberPurpose = (typeof NUMBER_PURPOSES)[number];
/** A messaging line (not `calls`): what may send, open a reply window or own a template. */
export const isWaLine = (v: string | null | undefined): v is WaLine =>
  WA_LINES.some((l) => l === v);
/**
 * A row received on / sent from a messaging line or none (history): never the calls number's
 * (docs/28 §10).
 */
export const onMessagingLine = <T extends { line: NumberPurpose | null }>(
  row: T,
): row is T & { line: WaLine | null } => row.line === null || isWaLine(row.line);
