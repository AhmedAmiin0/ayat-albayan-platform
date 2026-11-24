import type { LinkCandidate, UserRoleOption, UserStatus } from '@ab/shared';
import type { UserRole } from '@ab/catalog';
import type { ClockCycle } from '@ab/time';
import { t, locale, ltr } from '@ab/mobile-kit';
import { formatAt } from '@/ops/activity/activity-format';

// The words the users screens print, as the web's usersColumns / UserSummary / RolePicker do.

export const roleText = (role: UserRole): string => t.activity.roles[role];

/** Active = ok + filled glyph; disabled = bad + struck (never colour alone). */
export const statusStyle = (status: UserStatus) =>
  status === 'active' ? ({ tone: 'ok', glyph: 'fill' } as const) : ({ tone: 'bad', glyph: 'struck' } as const);

export const lastSignIn = (iso: string | null, cycle: ClockCycle, tz: string): string =>
  iso ? formatAt(iso, cycle, tz) : t.users.never;

/** The student code is an LTR island. */
export const recordText = (r: Pick<LinkCandidate, 'name' | 'code'>): string => (r.code ? `${r.name} ${ltr(r.code)}` : r.name);

/** A role's name in the UI language (the web's roleName). */
export const roleOptionName = (o: Pick<UserRoleOption, 'name_ar' | 'name_en'>): string =>
  locale === 'en' ? (o.name_en ?? o.name_ar) : o.name_ar;
