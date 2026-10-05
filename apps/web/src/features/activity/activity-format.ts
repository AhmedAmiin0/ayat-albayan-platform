import { intlLocale, type StatusStyle } from '@ab/shared';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';

// Display helpers of «سجل النشاط». DB times are UTC; the log is the academy's, so it reads in the
// academy's zone (Asia/Riyadh), 24h, Western digits like every other time in the product.

const AT = new Intl.DateTimeFormat(intlLocale(locale), {
  dateStyle: 'medium',
  timeStyle: 'medium',
  hourCycle: 'h23',
  timeZone: 'Asia/Riyadh',
});

export const formatAt = (iso: string): string => AT.format(new Date(iso));

type Dict = Record<string, string | undefined>;
const lookup = (dict: object, key: string): string | undefined => (dict as Dict)[key];

/** An action key ('expenses.create') → its label; else «verb + entity»; else the raw key. */
export function actionLabel(action: string, entity: string | null): string {
  const [group = '', verb = ''] = action.split('.');
  const groupLabels: unknown = Reflect.get(t.activity.actions, group);
  const exact = groupLabels && typeof groupLabels === 'object' ? lookup(groupLabels, verb) : undefined;
  if (exact) return exact;
  const verbLabel = lookup(t.activity.verbs, verb);
  const entityLabel = entity ? lookup(t.activity.entities, entity) : undefined;
  return verbLabel && entityLabel ? `${verbLabel} ${entityLabel}` : action;
}

export const roleLabel = (role: string): string => lookup(t.activity.roles, role) ?? role;

export const entityLabel = (entity: string): string => lookup(t.activity.entities, entity) ?? entity;

export const resultStyle = (status: number): StatusStyle =>
  status >= 400 ? { tone: 'bad', glyph: 'struck' } : { tone: 'ok', glyph: 'fill' };

export const resultLabel = (status: number): string =>
  status >= 400 ? t.activity.error.replace('{status}', String(status)) : t.activity.ok;

/** Profile routes the log can link to; other entities show as text. */
export type EntityLink =
  | { to: '/admin/students/$studentId'; params: { studentId: string } }
  | { to: '/admin/teachers/$teacherId'; params: { teacherId: string } };

export function entityLink(entity: string | null, id: string | null): EntityLink | null {
  if (!id) return null;
  if (entity === 'students') return { to: '/admin/students/$studentId', params: { studentId: id } };
  if (entity === 'teachers') return { to: '/admin/teachers/$teacherId', params: { teacherId: id } };
  return null;
}
