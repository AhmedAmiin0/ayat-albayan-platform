import { type Audience, audience } from './audience';

/** Each staff role gets its own tree (R-AUTH-01, docs/16 Mobile). */
const STAFF_ROLES = ['admin', 'teacher', 'sales', 'assistant'] as const;

/** Who may use the family app (docs/50 §7): a guardian, or a student who signs in themselves. */
const FAMILY_ROLES = ['guardian', 'student'] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
export type FamilyRole = (typeof FAMILY_ROLES)[number];
export type AppRole = StaffRole | FamilyRole;

const ROLES_OF: Record<Audience, readonly AppRole[]> = { staff: STAFF_ROLES, family: FAMILY_ROLES };
/** The roles that have an account but belong to the other app («wrongApp»). */
const OTHERS_OF: Record<Audience, readonly AppRole[]> = {
  staff: FAMILY_ROLES,
  family: STAFF_ROLES,
};

/** The role when it has a tree in THIS app, else null. */
export function appRole(role: unknown): AppRole | null {
  return ROLES_OF[audience()].find((r) => r === role) ?? null;
}

/** A real role of the other app gets its own message instead of "not activated". */
export function isOtherAppRole(role: unknown): boolean {
  return OTHERS_OF[audience()].some((r) => r === role);
}

/**
 * The `user_role` claim the auth hook puts on every access token (migration 005), read without
 * verifying: only for the offline fallback. The API checks the signed token on every call.
 */
export function roleClaim(accessToken: string): AppRole | null {
  const payload = accessToken.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json: unknown = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    return typeof json === 'object' && json !== null
      ? appRole((json as Record<string, unknown>).user_role)
      : null;
  } catch {
    return null;
  }
}
