import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { describe, expect, it } from 'vitest';
import { createTokenVerifier } from './verify-token';

const URL_ = 'http://127.0.0.1:54321';
const ISS = `${URL_}/auth/v1`;
const SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';

function hs256(claims: JWTPayload, secret = SECRET) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISS)
    .setAudience('authenticated')
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret));
}

describe('createTokenVerifier (R-AUTH-01)', () => {
  const verify = createTokenVerifier({ supabaseUrl: URL_, jwtSecret: SECRET });

  it('accepts a valid HS256 token and maps the role claim', async () => {
    const token = await hs256({ sub: 'u1', email: 'a@x.com', user_role: 'admin' });
    await expect(verify(token)).resolves.toEqual({ id: 'u1', email: 'a@x.com', role: 'admin', sessionId: null });
  });

  it('carries the session_id claim (push registrations are bound to it)', async () => {
    const token = await hs256({ sub: 'u1', session_id: 's-1' });
    await expect(verify(token)).resolves.toMatchObject({ sessionId: 's-1' });
  });

  it('returns role null for unknown or missing role claims', async () => {
    const token = await hs256({ sub: 'u1', user_role: 'superuser' });
    await expect(verify(token)).resolves.toMatchObject({ role: null, email: null });
  });

  it('rejects a token signed with another secret', async () => {
    const token = await hs256({ sub: 'u1' }, 'x'.repeat(40));
    await expect(verify(token)).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const token = await new SignJWT({ sub: 'u1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(ISS)
      .setAudience('authenticated')
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(SECRET));
    await expect(verify(token)).rejects.toThrow();
  });

  it('rejects a token from another issuer', async () => {
    const token = await new SignJWT({ sub: 'u1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('https://evil.example/auth/v1')
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET));
    await expect(verify(token)).rejects.toThrow();
  });

  it('rejects HS256 when no secret is configured', async () => {
    const noSecret = createTokenVerifier({ supabaseUrl: URL_, jwks: async () => new Uint8Array() });
    await expect(noSecret(await hs256({ sub: 'u1' }))).rejects.toThrow(/SUPABASE_JWT_SECRET/);
  });

  it('verifies asymmetric (ES256) tokens through the JWKS', async () => {
    const { publicKey, privateKey } = await generateKeyPair('ES256');
    const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'ES256' };
    const es = createTokenVerifier({ supabaseUrl: URL_, jwks: createLocalJWKSet({ keys: [jwk] }) });
    const token = await new SignJWT({ sub: 'u2', user_role: 'teacher' })
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setIssuer(ISS)
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(privateKey);
    await expect(es(token)).resolves.toMatchObject({ id: 'u2', role: 'teacher' });
  });
});
