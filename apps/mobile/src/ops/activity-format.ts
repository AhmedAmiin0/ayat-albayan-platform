import { intlLocale } from '@ab/shared';
import type { ActivityView, StatusStyle } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';

// The log is the academy's: times read in Asia/Riyadh, 24 h, Western digits (same as the web).

const AT = new Intl.DateTimeFormat(intlLocale(locale), {
  dateStyle: 'medium',
  timeStyle: 'short',
  hourCycle: 'h23',
  timeZone: 'Asia/Riyadh',
});

export const formatAt = (iso: string): string => AT.format(new Date(iso));

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
  return `${row.actor_name ?? t.activity.unknownUser} · ${roleLabel(row.actor_role)}`;
}

/** «الإدارة · طالب · 3 أكتوبر 2026 16:30»: the second line of a row. */
export function metaLine(row: Pick<ActivityView, 'entity' | 'at'>): string {
  return [row.entity ? entityLabel(row.entity) : null, formatAt(row.at)]
    .filter((p): p is string => p !== null)
    .join(' · ');
}
