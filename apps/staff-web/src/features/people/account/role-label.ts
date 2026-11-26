import type { AccountRole } from '@ab/shared';
import { t, locale } from '@ab/web-kit';

const BASE: Record<string, string | undefined> = t.activity.roles;

/** The held role's name in the UI language (the custom role's own names first), R-ACC-01. */
export function roleLabel(role: AccountRole): string {
  const own = locale === 'en' ? (role.name_en ?? role.name_ar) : (role.name_ar ?? role.name_en);
  return own?.trim() || BASE[role.base ?? 'unknown'] || t.activity.roles.unknown;
}
