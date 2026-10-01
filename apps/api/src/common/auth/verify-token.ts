import { isUserRole, type UserRole } from '@ab/shared';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTVerifyGetKey } from 'jose';

export type Role = UserRole;

export interface AuthUser {
  id: string;
  email: string | null;
  /** From the `user_role` claim added by public.custom_access_token_hook; null until a profile exists. */
  role: Role | null;
}

export interface VerifierOptions {
  supabaseUrl: string;
  /** Legacy HS256 secret. Asymmetric keys (ES256/RS256) are verified via the project JWKS. */
  jwtSecret?: string;
  /** Injected in tests; defaults to the project's /.well-known/jwks.json. */
  jwks?: JWTVerifyGetKey;
}

function toRole(value: unknown): Role | null {
  return isUserRole(value) ? value : null;
}

/** Builds a Supabase access-token verifier. Throws on invalid/expired tokens. */
export function createTokenVerifier(opts: VerifierOptions) {
  const issuer = `${opts.supabaseUrl}/auth/v1`;
  const jwks = opts.jwks ?? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  const secret = opts.jwtSecret ? new TextEncoder().encode(opts.jwtSecret) : undefined;

  return async (token: string): Promise<AuthUser> => {
    const { alg } = decodeProtectedHeader(token);
    const verifyOpts = { issuer, audience: 'authenticated' };
    const { payload } =
      alg === 'HS256'
        ? await jwtVerify(token, secret ?? failNoSecret(), verifyOpts)
        : await jwtVerify(token, jwks, verifyOpts);
    if (!payload.sub) throw new Error('token has no subject');
    const email = typeof payload['email'] === 'string' ? payload['email'] : null;
    return { id: payload.sub, email, role: toRole(payload['user_role']) };
  };
}

function failNoSecret(): never {
  throw new Error('HS256 token received but SUPABASE_JWT_SECRET is not set');
}
