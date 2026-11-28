import { instant } from '@ab/core';
import { waLineSchema } from '@ab/catalog';
import { z } from 'zod';
import {
  notificationAudienceSchema,
  notificationBlockerSchema,
  notificationChannelSchema,
  notificationKeySchema,
  notificationRuleViewSchema,
  notificationStateSchema,
  notificationTemplateViewSchema,
  rulesModeSchema,
  timingKeySchema,
} from './rules-view.schemas';

/**
 * One catalogue row with its state now (docs/23 §3). Fields marked v2 go only to clients that
 * send X-AB-Client; the first shape is frozen for older builds (docs/26 §2f).
 */
export const notificationEntryViewSchema = z.object({
  key: notificationKeySchema,
  audience: notificationAudienceSchema,
  /** v2: the others it reaches too, such as a schedule change's teacher. */
  also_to: z.array(notificationAudienceSchema).optional(),
  channels: z.array(notificationChannelSchema),
  automatic: z.boolean(),
  manual: z.boolean(),
  essential: z.boolean(),
  locked: z.boolean(),
  state: notificationStateSchema,
  blocker: notificationBlockerSchema.nullable(),
  templates: z.array(notificationTemplateViewSchema),
  /** The numbers it leaves from; empty for bell, push and free text. */
  lines: z.array(waLineSchema),
  timing: z.object({ key: timingKeySchema, value: z.string() }).nullable(),
  /** v2: some means lessons that pick an unapproved variant get nothing. */
  approval: z.enum(['all', 'some', 'none']).nullable().optional(),
  rule: notificationRuleViewSchema.optional(),
});
export type NotificationEntryView = z.infer<typeof notificationEntryViewSchema>;

/** The last good line check, so the number shows without asking Meta again (docs/23a §E H2). */
export const lineHealthViewSchema = z.object({
  line: waLineSchema,
  display_phone_e164: z.string().nullable(),
  verified_name: z.string().nullable(),
  checked_at: instant,
});
export type LineHealthView = z.infer<typeof lineHealthViewSchema>;

export const notificationsOverviewSchema = z.object({
  entries: z.array(notificationEntryViewSchema),
  lines: z.array(lineHealthViewSchema),
  /** v2: where producers read the rules now (settings.comms_source). */
  mode: rulesModeSchema.optional(),
  /** v2: whom a family-facing switch reaches, counting contacts with a phone. */
  reach: z.object({ guardian: z.number(), teacher: z.number(), lead: z.number() }).optional(),
});
export type NotificationsOverview = z.infer<typeof notificationsOverviewSchema>;
