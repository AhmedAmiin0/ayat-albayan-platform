import type { NotificationKey } from './catalogue.js';
import type { NotificationChannel, NotificationEntry } from './catalogue.types.js';
import { legacyParts, type RuleSettings } from './rules.legacy.js';
import { isTimedKey, RULE_TIMING_SCHEMAS, type AnyRuleTiming, type EffectiveRule, type NotificationRuleRow, type RulesMode } from './rules.types.js';

export interface ResolveInput {
  mode: RulesMode;
  /** The stored row, or null (never copied / edited, or the table could not be read). */
  row: Pick<NotificationRuleRow, 'enabled' | 'channels' | 'timing' | 'number_id'> | null;
  settings: RuleSettings;
}

/** The default timing of a timed row: today's behaviour (read from the legacy settings where one exists). */
export function defaultTiming(key: string, s: RuleSettings): AnyRuleTiming | null {
  if (key === 'lesson_reminder') return { minutes_before: s.reminder_minutes_before };
  if (key === 'lesson_reminder_24h') return { send_at_local: null };
  if (key === 'teacher_lesson_reminder') return { minutes_before: null };
  if (key === 'follow_up_slots') {
    return { hours: [...s.follow_up_hours], slots_from_hours: s.follow_up_slots_from_hours, slots_to_days: s.follow_up_slots_to_days };
  }
  return null;
}

/** The channels a row may switch off: every allowed channel but the first (it always stays). */
export const optionalChannels = (entry: NotificationEntry): NotificationChannel[] => entry.channels.slice(1);

/** A stored channel list, kept only when it is a subset of the entry's that includes its first channel. */
function validChannels(entry: NotificationEntry, stored: readonly string[] | null): NotificationChannel[] | null {
  if (!stored) return null;
  const allowed = entry.channels as readonly string[];
  if (!stored.every((c) => allowed.includes(c)) || !stored.includes(allowed[0] ?? '')) return null;
  return entry.channels.filter((c) => stored.includes(c));
}

/** A stored timing, kept only when the key's own schema accepts it (malformed = the default). */
export function validTiming(key: string, stored: unknown): AnyRuleTiming | null {
  if (!isTimedKey(key) || stored === null || stored === undefined) return null;
  const parsed = RULE_TIMING_SCHEMAS[key].safeParse(stored);
  return parsed.success ? (parsed.data as AnyRuleTiming) : null;
}

/**
 * A row's effective choices (pure). legacy mode: the legacy settings decide the mapped parts (today's
 * behaviour, byte-identical); the row decides only what has no legacy key (day-before hour, teacher
 * lead time, rows without a switch today). module mode: the row decides; the legacy settings are the
 * fallback for a missing or malformed part. Manual and locked rows are always on.
 */
export function resolveRule(entry: NotificationEntry<NotificationKey>, input: ResolveInput): EffectiveRule {
  const { row, settings } = input;
  const legacy = legacyParts(entry.key, settings);
  const stored = {
    enabled: row ? row.enabled : undefined,
    timing: row ? (validTiming(entry.key, row.timing) ?? undefined) : undefined,
  };
  const first = input.mode === 'legacy' ? legacy : stored;
  const second = input.mode === 'legacy' ? stored : legacy;
  const enabled = first.enabled ?? second.enabled ?? entry.defaults.enabled;
  const timing = first.timing ?? second.timing ?? defaultTiming(entry.key, settings);
  return {
    enabled: entry.manual || entry.locked ? true : enabled,
    channels: validChannels(entry, row?.channels ?? null) ?? [...entry.channels],
    timing,
    number_id: row?.number_id ?? null,
  };
}
