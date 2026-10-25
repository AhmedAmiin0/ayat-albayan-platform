import { ACTIVITY_ROLES } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import type { ListParams } from '@/core/lib/query/query-keys';
import { ascii } from './ascii-digits';

/** The server's filters of GET /activity that fit a phone: who (role), what (entity), when (days). */
export interface ActivityFilters {
  role: string;
  entity: string;
  from: string;
  to: string;
}

export const ALL = 'all';
export const NO_FILTERS: ActivityFilters = { role: ALL, entity: ALL, from: '', to: '' };

export const ROLES = ACTIVITY_ROLES;
export const ENTITIES = Object.keys(t.activity.entities);

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const isDay = (v: string): boolean => {
  const s = ascii(v);
  return (
    DAY.test(s) &&
    !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) &&
    new Date(`${s}T00:00:00Z`).toISOString().startsWith(s)
  );
};

export type DateError = 'dateInvalid' | 'dateOrder';

/** A typed date that is not a day, or a start after the end; blank is fine (no bound). */
export function dateError(f: Pick<ActivityFilters, 'from' | 'to'>): DateError | null {
  const [from, to] = [ascii(f.from), ascii(f.to)];
  if ((from && !isDay(from)) || (to && !isDay(to))) return 'dateInvalid';
  return from && to && from > to ? 'dateOrder' : null;
}

/** Query params of the filters; 'all' and an invalid or blank date are left out. */
export function filterParams(f: ActivityFilters): ListParams {
  const ok = dateError(f) === null;
  return {
    role: f.role === ALL ? undefined : f.role,
    entity: f.entity === ALL ? undefined : f.entity,
    from: ok && f.from ? ascii(f.from) : undefined,
    to: ok && f.to ? ascii(f.to) : undefined,
  };
}

export const isFiltered = (f: ActivityFilters): boolean =>
  Object.values(filterParams(f)).some((v) => v !== undefined);
