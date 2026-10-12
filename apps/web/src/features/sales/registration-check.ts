import { registrationCheckQuerySchema } from '@ab/shared';

// «التحقق من التسجيل» (docs/16 row 23): the same query rules as the API, checked before any request.

export type CheckBy = 'phone' | 'name';
export type CheckErrorCode = 'query_too_short' | 'invalid_phone' | 'one_of';

const CODES: readonly CheckErrorCode[] = ['query_too_short', 'invalid_phone', 'one_of'];

export type CheckRequest = { ok: true; by: CheckBy; path: string } | { ok: false; code: CheckErrorCode };

/** The GET path for a phone (normalised to E.164) or a name / code, or why it cannot be asked. */
export function checkRequest(by: CheckBy, value: string): CheckRequest {
  const parsed = registrationCheckQuerySchema.safeParse(by === 'phone' ? { phone: value } : { q: value });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message;
    const code = CODES.find((c) => c === message) ?? (by === 'phone' ? 'invalid_phone' : 'one_of');
    return { ok: false, code };
  }
  const query = parsed.data.by === 'phone' ? { phone: parsed.data.phone } : { q: parsed.data.q };
  return { ok: true, by, path: `/sales/registration-check?${new URLSearchParams(query).toString()}` };
}
