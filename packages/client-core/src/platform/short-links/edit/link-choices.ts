import { SHORT_LINK_MAX_DAYS } from '@ab/shared';
import { addDaysIn, localDateIn, zonedInstant } from '@ab/time';
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

/** «تاريخ آخر» ends at the close of the picked day, in the viewer's zone. */
const DAY_END = '23:59';

/** A day picked on the calendar (YYYY-MM-DD, the viewer's zone): its 23:59 there. */
export const dayEndExpiry = (day: string, tz: string): LinkExpiry => ({
  kind: 'date',
  at: zonedInstant(day, DAY_END, tz),
});

export interface ExpiryDayRange {
  /** Today: its 23:59 is still ahead. */
  min: string;
  /** The last day whose 23:59 stays within SHORT_LINK_MAX_DAYS of now (the API's limit). */
  max: string;
}

/** The days the calendar of «تاريخ آخر» offers (YYYY-MM-DD in the viewer's zone). */
export const expiryDayRange = (clock: LinkClock): ExpiryDayRange => ({
  min: localDateIn(clock.now, clock.tz),
  max: localDateIn(addDaysIn(clock.now, SHORT_LINK_MAX_DAYS - 1, clock.tz), clock.tz),
});

/** The calendar's day of the expiry (YYYY-MM-DD in the viewer's zone). */
export const expiryDay = (expiry: LinkExpiry, clock: LinkClock): string =>
  localDateIn(Date.parse(expiresAtOf(expiry, clock)), clock.tz);
