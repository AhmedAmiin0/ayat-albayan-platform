import { dateText } from '@ab/shared';
import type { ActivityView, ClockCycle, StatusStyle } from '@ab/shared';
import { clockIn, dateWithClock } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { isolate } from '@/core/ui/primitives/Ltr';

// The log's times read in the viewer's zone (docs/34), 12 or 24 h as they chose, Western digits.

/** «03/10/2026، 16:30» / «… 4:30 م» on the clock of the viewer's `tz`. */
export function formatAt(iso: string, cycle: ClockCycle, tz: string): string {
  const day = dateText(new Date(iso), { tz, locale }, { dateStyle: 'medium' });
  return dateWithClock(day, clockIn(new Date(iso), tz, cycle));
}

const lookup = (dict: object, key: string): string | undefined =>
  (dict as Record<string, string | undefined>)[key];

/** An action key ('expenses.create') → its label; else «verb + entity»; else the raw key. */
export function actionLabel(action: string, entity: string | null): string {
  const [group = '', verb = ''] = action.split('.');
  const groupLabels: unknown = Reflect.get(t.activity.actions, group);
  const exact =
    groupLabels && typeof groupLabels === 'object' ? lookup(groupLabels, verb) : undefined;
  if (exact) return exact;
  const verbLabel = lookup(t.activity.verbs, verb);
  const entityLabel = entity ? lookup(t.activity.entities, entity) : undefined;
  return verbLabel && entityLabel ? `${verbLabel} ${entityLabel}` : action;
}

export const roleLabel = (role: string): string => lookup(t.activity.roles, role) ?? role;
export const entityLabel = (entity: string): string =>
  lookup(t.activity.entities, entity) ?? entity;

export const resultStyle = (status: number): StatusStyle =>
  status >= 400 ? { tone: 'bad', glyph: 'struck' } : { tone: 'ok', glyph: 'fill' };

export const resultLabel = (status: number): string =>
  status >= 400 ? t.activity.error.replace('{status}', String(status)) : t.activity.ok;

/** «سارة · الإدارة»: who did it, with their role. */
export function actorLine(row: Pick<ActivityView, 'actor_name' | 'actor_role'>): string {
  return `${row.actor_name ? isolate(row.actor_name) : t.activity.unknownUser} · ${roleLabel(row.actor_role)}`;
}

/** «الإدارة · طالب · 3 أكتوبر 2026 16:30»: the second line of a row. */
export function metaLine(row: Pick<ActivityView, 'entity' | 'at'>, cycle: ClockCycle, tz: string): string {
  return [row.entity ? entityLabel(row.entity) : null, formatAt(row.at, cycle, tz)]
    .filter((p): p is string => p !== null)
    .join(' · ');
}
