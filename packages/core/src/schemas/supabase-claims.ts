import { z } from 'zod';

/**
 * The claims of a Supabase access token that the apps read (docs/36 z9). A claim of the wrong type
 * reads as absent (null): the API verifies the signature first (jose), the phone reads `user_role`
 * unverified for its offline fallback only. `user_role` comes from the auth hook (migration 005).
 */
export const supabaseClaimsSchema = z.looseObject({
  sub: z.string().nullable().catch(null),
  email: z.string().nullable().catch(null),
  session_id: z.string().nullable().catch(null),
  user_role: z.string().nullable().catch(null),
});

export type SupabaseClaims = z.infer<typeof supabaseClaimsSchema>;
