/**
 * Who may use the app, each with their own tree (R-AUTH-01): admins the admin tabs, teachers the
 * teacher tabs, the salesperson (base role sales, «المبيعات») the sales tabs and the classroom
 * assistant («مساعد حلقة») the assistant tabs (owner 2026-10-12, docs/16 «Mobile»).
 */
export const APP_ROLES = ['admin', 'teacher', 'sales', 'assistant'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function appRole(role: unknown): AppRole | null {
  return APP_ROLES.find((r) => r === role) ?? null;
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
    return typeof json === 'object' && json !== null ? appRole((json as Record<string, unknown>)['user_role']) : null;
  } catch {
    return null;
  }
}
