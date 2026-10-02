import type { Enums } from '@ab/db';

// Phase 4 enums (migrations 072, 140–143): WhatsApp messages, the template registry, admin pushes.
// Each mirrors a DB enum; `satisfies` breaks the build if one drifts.
export const MESSAGE_DIRECTIONS = [
  'inbound',
  'outbound',
] as const satisfies readonly Enums<'message_direction'>[];
export const MESSAGE_STATUSES = [
  'queued',
  'sent',
  'delivered',
  'read',
  'failed',
  'sent_manually',
] as const satisfies readonly Enums<'message_status'>[];
export const TEMPLATE_STATUSES = [
  'not_submitted',
  'pending',
  'approved',
  'rejected',
  'paused',
  'disabled',
  'missing',
] as const satisfies readonly Enums<'template_status'>[];
export const TEMPLATE_CATEGORIES = [
  'utility',
  'marketing',
] as const satisfies readonly Enums<'template_category'>[];
/** R-MOB-01's five events plus new_message (mobile.pushRationale promises «رسالة جديدة»). */
export const PUSH_KINDS = [
  'new_lead',
  'new_message',
  'lesson_needs_confirmation',
  'report_submitted',
  'reminder_failed',
  'payment_due',
] as const satisfies readonly Enums<'push_kind'>[];

export type MessageDirection = Enums<'message_direction'>;
export type MessageStatus = Enums<'message_status'>;
export type TemplateStatus = Enums<'template_status'>;
export type TemplateCategory = Enums<'template_category'>;
export type PushKind = Enums<'push_kind'>;
