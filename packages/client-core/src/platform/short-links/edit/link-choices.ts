import { calendarDaysBetween, localDateIn } from '@ab/shared';
import { roleKey, type RoleKey } from '../link-people.js';
import {
  EXPIRY_DAY_CHOICES, expiresAtOf, type LinkClock, type LinkExpiry,
} from '../link-form.js';

// The pickers of «رابط جديد» (boards LinkXStaffCreate, LinkXStaffPeople): the people filter
// chips and the lifetime chips with «تاريخ آخر» picked on a calendar.

/** shortLinks.people.filters.<key>. */
export const PEOPLE_FILTERS = ['all', 'guardians', 'students', 'teachers', 'staff'] as const;
export type PeopleFilter = (typeof PEOPLE_FILTERS)[number];

const GROUP: Readonly<Record<RoleKey, Exclude<PeopleFilter, 'all'>>> = {
  guardian: 'guardians',
  student: 'students',
  teacher: 'teachers',
  admin: 'staff',
  assistant: 'staff',
  sales: 'staff',
  public: 'staff',
  unknown: 'staff',
};

/** Does a person of this role show under the chip? */
export const inPeopleFilter = (filter: PeopleFilter, role: string): boolean =>
  filter === 'all' || GROUP[roleKey(role)] === filter;

/** A lit chip: one of EXPIRY_DAY_CHOICES, or «تاريخ آخر». */
export type ExpiryChip = (typeof EXPIRY_DAY_CHOICES)[number] | 'date';

export function expiryChip(expiry: LinkExpiry): ExpiryChip {
  const days = expiry.kind === 'days' ? expiry.days : -1;
  return EXPIRY_DAY_CHOICES.find((d) => d === days) ?? 'date';
}

/** A day picked on the calendar (YYYY-MM-DD, the viewer's zone): that many days from now. */
export const dayExpiry = (day: string, clock: LinkClock): LinkExpiry => ({
  kind: 'days',
  days: calendarDaysBetween(localDateIn(clock.now, clock.tz), day),
});

/** The calendar's day of the expiry (YYYY-MM-DD in the viewer's zone). */
export const expiryDay = (expiry: LinkExpiry, clock: LinkClock): string =>
  localDateIn(Date.parse(expiresAtOf(expiry, clock)), clock.tz);
