import { LOGIN_CODE_LENGTH } from '@ab/shared';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { CodePurpose, Subject } from '../sign-in.ports';

/** A 6-digit code from the CSPRNG (leading zeros kept). Never logged, never stored in clear. */
export function newCode(pick: (max: number) => number = randomInt): string {
  return String(pick(10 ** LOGIN_CODE_LENGTH)).padStart(LOGIN_CODE_LENGTH, '0');
}

/**
 * HMAC-SHA256 under the server pepper, bound to the purpose and the subject: a code issued for one
 * account or purpose never matches another's row. 64 hex characters (login_codes.code_hash).
 */
export function hashCode(pepper: string, input: { purpose: CodePurpose; subject: Subject; code: string }): string {
  const { purpose, subject, code } = input;
  return createHmac('sha256', pepper).update(`${purpose}|${subject.kind}:${subject.id}|${code}`).digest('hex');
}

/** Constant-time compare of two hex hashes (different lengths are simply unequal). */
export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

/** When a code issued now stops working. */
export const expiryOf = (now: Date, ttlMinutes: number): Date => new Date(now.getTime() + ttlMinutes * 60_000);
