import { z } from 'zod';
import type { NotificationKey } from './catalogue.js';
import type { NotificationChannel } from './catalogue.types.js';

// docs/23 §3 phase 4 (amended by docs/26 §6 23-P4): the admin's overrides of the catalogue, one row of
// public.notification_rules per catalogue key that was copied or edited. Code still defines what exists.

/** Where producers read a row's choices: legacy settings keys, or notification_rules (settings.comms_source). */
export type RulesMode = 'legacy' | 'module';

/** «اليوم السابق الساعة …»: whole hours a select offers (never free text). null = at the lesson's own time. */
export const DAY_BEFORE_HOURS = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '19:00', '20:00', '21:00', '22:00'] as const;

const minutes = z.number().int().min(5).max(720);
const hoursList = z
  .array(z.number().int().min(1).max(720))
  .min(1)
  .max(5)
  .refine((xs) => xs.every((x, i) => i === 0 || x > (xs[i - 1] ?? 0)), 'ascending');

/** Each timing kind, validated by its own schema (unknown fields are refused). */
export const RULE_TIMING_SCHEMAS = {
  lesson_reminder: z.object({ minutes_before: minutes }).strict(),
  lesson_reminder_24h: z.object({ send_at_local: z.enum(DAY_BEFORE_HOURS).nullable() }).strict(),
  /** null = the same lead time as the families' reminder (today's behaviour). */
  teacher_lesson_reminder: z.object({ minutes_before: minutes.nullable() }).strict(),
  follow_up_slots: z
    .object({
      hours: hoursList,
      slots_from_hours: z.number().int().min(1).max(168),
      slots_to_days: z.number().int().min(1).max(30),
    })
    .strict(),
} as const;

export type TimedNotificationKey = keyof typeof RULE_TIMING_SCHEMAS;
export type RuleTiming<K extends TimedNotificationKey = TimedNotificationKey> = z.infer<(typeof RULE_TIMING_SCHEMAS)[K]>;
export type AnyRuleTiming = { [K in TimedNotificationKey]: RuleTiming<K> }[TimedNotificationKey];

export const isTimedKey = (key: string): key is TimedNotificationKey => Object.hasOwn(RULE_TIMING_SCHEMAS, key);

/** One stored row (public.notification_rules). channels / timing / number_id null = the entry's default. */
export interface NotificationRuleRow {
  key: string;
  enabled: boolean;
  channels: string[] | null;
  timing: unknown;
  number_id: string | null;
  updated_at: string;
  updated_by: string | null;
}

/** A row's effective choices, after validation and the legacy fallback (NotificationPolicy). */
export interface EffectiveRule {
  enabled: boolean;
  channels: NotificationChannel[];
  /** Only for TimedNotificationKey rows; null otherwise. */
  timing: AnyRuleTiming | null;
  /** null = the template's own number. */
  number_id: string | null;
}

/** The typed confirmation an essential row's OFF needs (ar.json notificationRules.essentialWord). */
export const ESSENTIAL_OFF_TEXT = 'إيقاف';

/**
 * PATCH /admin/notifications/:key body. Every field optional (only what changed); timing is checked
 * against the key's own schema by the server; confirmText only matters for an essential row's OFF.
 */
export const rulePatchSchema = z
  .object({
    enabled: z.boolean().optional(),
    channels: z.array(z.enum(['whatsapp', 'bell', 'push'])).min(1).max(3).optional(),
    timing: z.unknown().optional(),
    number_id: z.string().uuid().nullable().optional(),
    confirmText: z.unknown().optional(),
  })
  .strict();
export type RulePatchInput = z.infer<typeof rulePatchSchema>;

/** The row as GET /admin/notifications shows it to tagged clients (X-AB-Client), next to its v1 fields. */
export interface NotificationRuleView {
  key: NotificationKey;
  enabled: boolean;
  channels: NotificationChannel[];
  timing: AnyRuleTiming | null;
  number_id: string | null;
  /** false: listed only (manual rows) or locked. */
  editable: boolean;
  /** Channels the admin may switch off (the row's first channel always stays). */
  optional_channels: NotificationChannel[];
  updated_at: string | null;
  updated_by: string | null;
}

/** PATCH errors: 422 invalid / locked / unknown_number, 428 confirmation_required, 404 unknown key. */
export const RULE_ERRORS = ['invalid', 'locked', 'not_editable', 'unknown_number', 'confirmation_required'] as const;
export type RuleError = (typeof RULE_ERRORS)[number];
