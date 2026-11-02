import { jsonOf, supabaseClaimsSchema } from '@ab/shared';
import { z } from 'zod';

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

/** A JWT part (base64url) → its text; padding restored for `atob`. */
const fromBase64Url = (part: string): string => {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
};

/** The token's claims part as the shared claims (docs/36 z9). Bad base64 or JSON: no claims. */
const claimsPartSchema = z
  .string()
  .transform((part, ctx) => {
    try {
      return fromBase64Url(part);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'invalid_base64' });
      return z.NEVER;
    }
  })
  .pipe(jsonOf(supabaseClaimsSchema));

/**
 * The `user_role` claim the auth hook puts on every access token (migration 005), read without
 * verifying: only for the offline fallback. The API checks the signed token on every call.
 */
export function roleClaim(accessToken: string): AppRole | null {
  const parsed = claimsPartSchema.safeParse(accessToken.split('.')[1]);
  return parsed.success ? appRole(parsed.data.user_role) : null;
}
