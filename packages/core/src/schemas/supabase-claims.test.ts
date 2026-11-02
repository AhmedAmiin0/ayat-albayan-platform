import { describe, expect, it } from 'vitest';
import { supabaseClaimsSchema } from './supabase-claims.js';

describe('supabaseClaimsSchema', () => {
  it('reads the four claims and keeps the rest', () => {
    const claims = supabaseClaimsSchema.parse({
      sub: 'u1',
      email: 'a@b.test',
      session_id: 's1',
      user_role: 'admin',
      aud: 'authenticated',
    });
    expect(claims).toEqual({
      sub: 'u1',
      email: 'a@b.test',
      session_id: 's1',
      user_role: 'admin',
      aud: 'authenticated',
    });
  });

  it('a missing or wrongly typed claim reads as null, never a failure', () => {
    const claims = supabaseClaimsSchema.parse({ sub: 7, email: null, user_role: ['admin'] });
    expect(claims).toMatchObject({ sub: null, email: null, session_id: null, user_role: null });
  });

  it('only a non-object fails', () => {
    expect(supabaseClaimsSchema.safeParse(null).success).toBe(false);
    expect(supabaseClaimsSchema.safeParse('x').success).toBe(false);
  });
});
