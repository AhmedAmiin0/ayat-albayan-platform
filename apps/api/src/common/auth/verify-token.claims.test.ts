import { SignJWT, type JWTPayload } from 'jose';
import { describe, expect, it } from 'vitest';
import { createTokenVerifier } from './verify-token';

// docs/36 z9: the claims are read through supabaseClaimsSchema after jose verifies the signature.

const URL_ = 'http://127.0.0.1:54321';
const SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';

const hs256 = (claims: JWTPayload): Promise<string> =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(`${URL_}/auth/v1`)
    .setAudience('authenticated')
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(SECRET));

describe('createTokenVerifier claims (docs/36 z9)', () => {
  const verify = createTokenVerifier({ supabaseUrl: URL_, jwtSecret: SECRET });

  it('wrongly typed email, session_id and user_role read as null', async () => {
    const token = await hs256({ sub: 'u1', email: 5, session_id: {}, user_role: ['admin'] });
    await expect(verify(token)).resolves.toEqual({
      id: 'u1',
      email: null,
      role: null,
      sessionId: null,
    });
  });

  it('a token without a subject, or an empty one, is refused', async () => {
    await expect(verify(await hs256({ email: 'a@x.com' }))).rejects.toThrow('token has no subject');
    await expect(verify(await hs256({ sub: '' }))).rejects.toThrow('token has no subject');
  });

  it('a non-string subject is refused (z9: was passed on as a non-string id)', async () => {
    const token = await new SignJWT({ sub: 7 } as unknown as JWTPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(`${URL_}/auth/v1`)
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET));
    await expect(verify(token)).rejects.toThrow('token has no subject');
  });
});
