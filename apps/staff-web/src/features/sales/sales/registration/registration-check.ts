import { registrationCheckQuerySchema } from '@ab/shared';
import type { RegistrationCheckBy, RegistrationCheckCode } from '@ab/shared';
import type { CheckRequest } from './registration-check.types';

// The same query rules as the API (docs/16 row 23), checked before any request.

const CODES: readonly RegistrationCheckCode[] = ['query_too_short', 'invalid_phone', 'one_of'];

/** The query for a phone (normalised to E.164) or a name / code, or why it cannot be asked. */
export function checkRequest(by: RegistrationCheckBy, value: string): CheckRequest {
  const parsed = registrationCheckQuerySchema.safeParse(by === 'phone' ? { phone: value } : { q: value });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message;
    const code = CODES.find((c) => c === message) ?? (by === 'phone' ? 'invalid_phone' : 'one_of');
    return { ok: false, code };
  }
  const query = parsed.data.by === 'phone' ? { phone: parsed.data.phone } : { q: parsed.data.q };
  return { ok: true, by, query };
}
