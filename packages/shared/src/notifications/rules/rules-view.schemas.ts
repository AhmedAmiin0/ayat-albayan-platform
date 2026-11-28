import { id, instant } from '@ab/core';
import { templateStatusSchema, waLineSchema } from '@ab/catalog';
import { z } from 'zod';
import { NOTIFICATION_KEYS } from '../catalogue/catalogue';
import { NOTIFICATION_AUDIENCES, NOTIFICATION_CHANNELS } from '../catalogue/catalogue.types';
import { NOTIFICATION_BLOCKERS } from '../catalogue/catalogue-views';
import { RULE_TIMING_SCHEMAS as TIMING } from '../rules.types';

export const notificationKeySchema = z.enum(NOTIFICATION_KEYS);
export const notificationAudienceSchema = z.enum(NOTIFICATION_AUDIENCES);
export const notificationChannelSchema = z.enum(NOTIFICATION_CHANNELS);
export const notificationBlockerSchema = z.enum(NOTIFICATION_BLOCKERS);
export type NotificationBlocker = z.infer<typeof notificationBlockerSchema>;
/** on: goes out when triggered; off: held by the first blocker; manual: a person sends it. */
export const notificationStateSchema = z.enum(['on', 'off', 'manual']);
export type NotificationState = z.infer<typeof notificationStateSchema>;
export const timingKeySchema = z.enum([
  'reminder_minutes_before',
  'renewal_alert_remaining',
  'follow_up_hours',
]);
export const rulesModeSchema = z.enum(['legacy', 'module']);

/** A timed row's choice as it is sent: each kind's own fields, extra keys stripped. */
export const ruleTimingSchema = z.union([
  z.object(TIMING.lesson_reminder.shape),
  z.object(TIMING.lesson_reminder_24h.shape),
  z.object(TIMING.teacher_lesson_reminder.shape),
  z.object(TIMING.follow_up_slots.shape),
]);

/** The admin's choices for a row, shown to tagged clients next to its first-shape fields. */
export const notificationRuleViewSchema = z.object({
  key: notificationKeySchema,
  enabled: z.boolean(),
  channels: z.array(notificationChannelSchema),
  timing: ruleTimingSchema.nullable(),
  number_id: id().nullable(),
  /** false: listed only (manual rows) or locked. */
  editable: z.boolean(),
  /** The row's first channel always stays, so it is never listed here. */
  optional_channels: z.array(notificationChannelSchema),
  updated_at: instant.nullable(),
  updated_by: id().nullable(),
});
export type NotificationRuleView = z.infer<typeof notificationRuleViewSchema>;

export const notificationTemplateViewSchema = z.object({
  key: z.string(),
  /** null: the template has no row in message_templates (never synced). */
  status: templateStatusSchema.nullable(),
  line: waLineSchema.nullable(),
});
export type NotificationTemplateView = z.infer<typeof notificationTemplateViewSchema>;
