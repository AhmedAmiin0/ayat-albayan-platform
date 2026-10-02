/** Who may use the app: admins get the admin tabs, teachers the teacher tabs (R-AUTH-01). */
export type AppRole = 'admin' | 'teacher';

export function appRole(role: unknown): AppRole | null {
  return role === 'admin' || role === 'teacher' ? role : null;
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
