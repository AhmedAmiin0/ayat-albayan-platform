import type { AcademySettings, SettingKey } from '../settings/index.js';
import type { NotificationKey } from './catalogue/catalogue.js';
import type { AnyRuleTiming, EffectiveRule } from './rules.types.js';

/**
 * The 8 settings keys the notification rules own (docs/26 §1 «MODULE التواصل → الإشعارات»; ownedBy
 * 'notifications' in the registry). renewal_alert_remaining is NOT one: it stays CONFIG and the
 * renewal row shows it by reference (docs/26 §1).
 */
export const RULE_SETTING_KEYS = [
  'reminder_minutes_before',
  'reminder_24h_enabled',
  'teacher_whatsapp_new_student',
  'teacher_whatsapp_lesson_reminder',
  'follow_up_hours',
  'follow_up_slots_from_hours',
  'follow_up_slots_to_days',
  'feedback_mode',
] as const satisfies readonly SettingKey[];
export type RuleSettingKey = (typeof RULE_SETTING_KEYS)[number];
export type RuleSettings = Pick<AcademySettings, RuleSettingKey>;

/** Which part of a row mirrors which legacy keys (the copy, the policy's fallback and parity use it). */
export const RULE_LEGACY_MAP = {
  lesson_reminder: { timing: ['reminder_minutes_before'] },
  lesson_reminder_24h: { enabled: ['reminder_24h_enabled'] },
  teacher_lesson_reminder: { enabled: ['teacher_whatsapp_lesson_reminder'] },
  teacher_new_student: { enabled: ['teacher_whatsapp_new_student'] },
  follow_up_slots: {
    timing: ['follow_up_hours', 'follow_up_slots_from_hours', 'follow_up_slots_to_days'],
  },
  lesson_rating: { enabled: ['feedback_mode'] },
} as const satisfies Partial<
  Record<
    NotificationKey,
    { enabled?: readonly RuleSettingKey[]; timing?: readonly RuleSettingKey[] }
  >
>;
export type LegacyMappedKey = keyof typeof RULE_LEGACY_MAP;

export const isLegacyMapped = (key: string): key is LegacyMappedKey =>
  Object.hasOwn(RULE_LEGACY_MAP, key);

type LegacyRule = Pick<EffectiveRule, 'enabled' | 'timing'>;
type Timing = (AnyRuleTiming & Record<string, unknown>) | null;

/** One mapped row both ways: what its legacy keys say (parts), what its choices write (values). */
interface LegacyCodec {
  parts: (s: RuleSettings) => Partial<LegacyRule>;
  values: (rule: LegacyRule, timing: Timing) => Partial<RuleSettings>;
}

const minutesOf = (t: Timing): Partial<RuleSettings> =>
  t && typeof t.minutes_before === 'number' ? { reminder_minutes_before: t.minutes_before } : {};

const followUpOf = (t: Timing): Partial<RuleSettings> =>
  t && Array.isArray(t.hours)
    ? {
        follow_up_hours: t.hours as number[],
        follow_up_slots_from_hours: t.slots_from_hours as number,
        follow_up_slots_to_days: t.slots_to_days as number,
      }
    : {};

/** The legacy codec per mapped row (docs/36 f5; exhaustive over RULE_LEGACY_MAP's keys). */
const LEGACY_CODEC = {
  lesson_reminder: {
    parts: (s) => ({ timing: { minutes_before: s.reminder_minutes_before } }),
    values: (_rule, t) => minutesOf(t),
  },
  lesson_reminder_24h: {
    parts: (s) => ({ enabled: s.reminder_24h_enabled }),
    values: (rule) => ({ reminder_24h_enabled: rule.enabled }),
  },
  teacher_lesson_reminder: {
    parts: (s) => ({ enabled: s.teacher_whatsapp_lesson_reminder }),
    values: (rule) => ({ teacher_whatsapp_lesson_reminder: rule.enabled }),
  },
  teacher_new_student: {
    parts: (s) => ({ enabled: s.teacher_whatsapp_new_student }),
    values: (rule) => ({ teacher_whatsapp_new_student: rule.enabled }),
  },
  follow_up_slots: {
    parts: (s) => ({
      timing: {
        hours: [...s.follow_up_hours],
        slots_from_hours: s.follow_up_slots_from_hours,
        slots_to_days: s.follow_up_slots_to_days,
      },
    }),
    values: (_rule, t) => followUpOf(t),
  },
  lesson_rating: {
    parts: (s) => ({ enabled: s.feedback_mode === 'buttons' }),
    values: (rule) => ({ feedback_mode: rule.enabled ? 'buttons' : 'link' }),
  },
} satisfies Record<LegacyMappedKey, LegacyCodec>;

const codecOf = (key: string): LegacyCodec | undefined =>
  isLegacyMapped(key) ? LEGACY_CODEC[key] : undefined;

/** What the legacy settings say about a row (only its mapped parts). */
export function legacyParts(key: string, s: RuleSettings): Partial<LegacyRule> {
  return codecOf(key)?.parts(s) ?? {};
}

/** The legacy settings a row's effective choices write back (legacy mode, and the flip back to legacy). */
export function legacyValues(key: string, rule: LegacyRule): Partial<RuleSettings> {
  return codecOf(key)?.values(rule, rule.timing) ?? {};
}
