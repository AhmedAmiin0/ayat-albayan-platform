import type { AcademySettings, SettingKey } from '@ab/settings';
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
  follow_up_slots: { timing: ['follow_up_hours', 'follow_up_slots_from_hours', 'follow_up_slots_to_days'] },
  lesson_rating: { enabled: ['feedback_mode'] },
} as const satisfies Partial<Record<NotificationKey, { enabled?: readonly RuleSettingKey[]; timing?: readonly RuleSettingKey[] }>>;
export type LegacyMappedKey = keyof typeof RULE_LEGACY_MAP;

export const isLegacyMapped = (key: string): key is LegacyMappedKey => Object.hasOwn(RULE_LEGACY_MAP, key);

/** What the legacy settings say about a row (only its mapped parts). */
export function legacyParts(key: string, s: RuleSettings): Partial<Pick<EffectiveRule, 'enabled' | 'timing'>> {
  switch (key) {
    case 'lesson_reminder':
      return { timing: { minutes_before: s.reminder_minutes_before } };
    case 'lesson_reminder_24h':
      return { enabled: s.reminder_24h_enabled };
    case 'teacher_lesson_reminder':
      return { enabled: s.teacher_whatsapp_lesson_reminder };
    case 'teacher_new_student':
      return { enabled: s.teacher_whatsapp_new_student };
    case 'follow_up_slots':
      return {
        timing: { hours: [...s.follow_up_hours], slots_from_hours: s.follow_up_slots_from_hours, slots_to_days: s.follow_up_slots_to_days },
      };
    case 'lesson_rating':
      return { enabled: s.feedback_mode === 'buttons' };
    default:
      return {};
  }
}

/** The legacy settings a row's effective choices write back (legacy mode, and the flip back to legacy). */
export function legacyValues(key: string, rule: Pick<EffectiveRule, 'enabled' | 'timing'>): Partial<RuleSettings> {
  const t = rule.timing as (AnyRuleTiming & Record<string, unknown>) | null;
  switch (key) {
    case 'lesson_reminder':
      return t && typeof t.minutes_before === 'number' ? { reminder_minutes_before: t.minutes_before } : {};
    case 'lesson_reminder_24h':
      return { reminder_24h_enabled: rule.enabled };
    case 'teacher_lesson_reminder':
      return { teacher_whatsapp_lesson_reminder: rule.enabled };
    case 'teacher_new_student':
      return { teacher_whatsapp_new_student: rule.enabled };
    case 'follow_up_slots':
      if (!t || !Array.isArray(t.hours)) return {};
      return {
        follow_up_hours: t.hours as number[],
        follow_up_slots_from_hours: t.slots_from_hours as number,
        follow_up_slots_to_days: t.slots_to_days as number,
      };
    case 'lesson_rating':
      return { feedback_mode: rule.enabled ? 'buttons' : 'link' };
    default:
      return {};
  }
}
