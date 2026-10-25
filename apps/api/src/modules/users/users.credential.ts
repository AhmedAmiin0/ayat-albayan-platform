import { passwordProblem, type CredentialMode, type IssuedCredential } from '@ab/shared';
import { badRequest } from '../../common/http/errors';
import { generatePassword } from './users.password';
import type { AuthAdmin } from './users.store';

export interface CredentialRequest {
  mode: CredentialMode;
  password?: string | undefined;
  min: number;
}

/** The password to set now (undefined in link mode) and what to show the admin once. */
export interface PreparedCredential {
  password: string | undefined;
  issued: IssuedCredential | null;
}

/** 400 password_blank / password_too_short / password_too_long for a typed password. */
export function prepareCredential(req: CredentialRequest): PreparedCredential {
  if (req.mode === 'link') return { password: undefined, issued: null };
  if (req.mode === 'generate') {
    const value = generatePassword(req.min);
    return { password: value, issued: { kind: 'password', value } };
  }
  const problem = passwordProblem(req.password ?? '', req.min);
  if (problem) throw badRequest(`password_${problem}`, { min: req.min });
  return { password: req.password, issued: null };
}

/** link mode: the recovery action link (no SMTP: the admin sends it by WhatsApp). */
export async function withLink(auth: AuthAdmin, ctx: { email: string; prepared: PreparedCredential; mode: CredentialMode }): Promise<IssuedCredential | null> {
  if (ctx.mode !== 'link') return ctx.prepared.issued;
  return { kind: 'link', value: await auth.recoveryLink(ctx.email) };
}
