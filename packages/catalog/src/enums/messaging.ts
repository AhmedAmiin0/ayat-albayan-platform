// Phase 4 enums (migrations 072, 140–143): WhatsApp messages, the template registry, admin pushes.
// Each mirrors a DB enum; the api's enum-parity tests catch drift.
import { z } from 'zod';

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
/** R-MOB-01's events plus new_message, new_student (R-NOT-03), meeting_invite (R-NOT-01), etc. */
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
/** Family app kinds (docs/50 §5 item 6), apart since staff apps map PUSH_KINDS exhaustively. */
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

export const messageDirectionSchema = z.enum(MESSAGE_DIRECTIONS);
export type MessageDirection = z.infer<typeof messageDirectionSchema>;
export const messageStatusSchema = z.enum(MESSAGE_STATUSES);
export type MessageStatus = z.infer<typeof messageStatusSchema>;
export const templateStatusSchema = z.enum(TEMPLATE_STATUSES);
export type TemplateStatus = z.infer<typeof templateStatusSchema>;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];
/** A staff kind (the staff apps' exhaustive maps); AnyPushKind for whatever is stored or sent. */
export type PushKind = (typeof PUSH_KINDS)[number];
export type FamilyPushKind = (typeof FAMILY_PUSH_KINDS)[number];
/** Any push_notifications.kind (the DB enum push_kind). */
export type AnyPushKind = (typeof ALL_PUSH_KINDS)[number];
/** A messaging line (sends and reply windows); never `calls` (docs/28 §10). */
export const waLineSchema = z.enum(WA_LINES);
export type WaLine = z.infer<typeof waLineSchema>;
/**
 * A wa_numbers role: a messaging line, or `calls` (a number that only carries WhatsApp calls,
 * docs/28 §10).
 */
export const numberPurposeSchema = z.enum(NUMBER_PURPOSES);
export type NumberPurpose = z.infer<typeof numberPurposeSchema>;
/** A messaging line (not `calls`): what may send, open a reply window or own a template. */
export const isWaLine = (v: string | null | undefined): v is WaLine => waLineSchema.validate(v);
/**
 * A row received on / sent from a messaging line or none (history): never the calls number's
 * (docs/28 §10).
 */
export const onMessagingLine = <T extends { line: NumberPurpose | null }>(
  row: T,
): row is T & { line: WaLine | null } => row.line === null || isWaLine(row.line);
