import type { CatalogueSettings } from './catalogue-settings.js';
import type { NotificationEntry } from './catalogue.types.js';
import type { NotificationEntryView } from './catalogue-views.js';
import type { EffectiveRule } from '../rules.types.js';

const text = (value: unknown): string => (Array.isArray(value) ? value.join('، ') : String(value));

const field = (rule: EffectiveRule | undefined, name: string): unknown => {
  const t = rule?.timing as Record<string, unknown> | null | undefined;
  return t ? t[name] : undefined;
};

/**
 * The value a rule-driven row shows (docs/23b): the families' lead time for every row timed by
 * reminder_minutes_before; the teacher's own lead time when set (else the families'); the follow-up
 * hours. renewal_alert_remaining stays CONFIG (docs/26 §1): always read from the settings.
 */
function fromRules(entry: NotificationEntry, rules: ReadonlyMap<string, EffectiveRule>): unknown {
  if (entry.timing === 'reminder_minutes_before') {
    const own = entry.key === 'teacher_lesson_reminder' ? field(rules.get(entry.key), 'minutes_before') : undefined;
    return own ?? field(rules.get('lesson_reminder'), 'minutes_before');
  }
  if (entry.timing === 'follow_up_hours') return field(rules.get('follow_up_slots'), 'hours');
  return undefined;
}

/** When it is sent: the governing setting and its current value as text («60», «24، 72»). */
export function timingOf(
  entry: NotificationEntry,
  settings: CatalogueSettings,
  rules?: ReadonlyMap<string, EffectiveRule>,
): NotificationEntryView['timing'] {
  if (!entry.timing) return null;
  const value = (rules ? fromRules(entry, rules) : undefined) ?? settings[entry.timing];
  return { key: entry.timing, value: text(value) };
}

/** How many of a row's template variants are approved (PR #134 item 7); null without a template. */
export function approvalOf(templates: readonly { status: string | null }[]): NotificationEntryView['approval'] {
  if (templates.length === 0) return null;
  const approved = templates.filter((t) => t.status === 'approved').length;
  if (approved === templates.length) return 'all';
  return approved > 0 ? 'some' : 'none';
}
