import type { Tables } from '@ab/db';
import { isPermission, type Permission, type RoleView } from '@ab/shared';

import { BUNDLES, ar } from '../../common/i18n/server-text';

export type RoleRow = Tables<'roles'>;

export function toView(row: RoleRow, perms: readonly string[], userCount: number): RoleView {
  return {
    id: row.id,
    key: row.key,
    name_ar: row.name_ar,
    name_en: row.name_en,
    base_role: row.base_role,
    is_system: row.is_system,
    permissions: perms.filter(isPermission).sort(),
    user_count: userCount,
  };
}

const MAX_KEY = 40;

/** `finance_clerk` → `finance_clerk_copy`, `_copy2`, … the first key not in `taken` (≤ 40 chars). */
export function copyKey(key: string, taken: ReadonlySet<string>): string {
  for (let n = 1; ; n += 1) {
    const suffix = n === 1 ? '_copy' : `_copy${n}`;
    const candidate = `${key.slice(0, MAX_KEY - suffix.length)}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** The permissions to add and to remove to turn `current` into `next`. */
export function diffPermissions(
  current: readonly string[],
  next: readonly Permission[],
): { add: Permission[]; remove: string[] } {
  const have = new Set(current);
  const want = new Set<string>(next);
  return { add: next.filter((p) => !have.has(p)), remove: current.filter((p) => !want.has(p)) };
}

/** «{name} (نسخة)» / «{name} (copy)»: the suffix comes from the i18n bundles, never from code. */
export const copyName = (locale: 'ar' | 'en', name: string): string =>
  (locale === 'ar' ? ar.roles.copyName : BUNDLES.en.roles.copyName).replace('{name}', name);
