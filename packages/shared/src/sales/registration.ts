import { z } from 'zod';
import { normalizeArabic } from '../format/arabic.js';
import type { StudentStatus } from '../enums/index.js';
import { phoneE164 } from '../schemas/common.js';

// «التحقق من التسجيل» (owner 2026-10-12, docs/16 row 23): is this family / child already a student? By the
// guardian's phone (E.164) or by an Arabic-normalised name or a code. Whitelisted answer: name, code, status
// and teacher only: never an id, a phone number, a package, money or a note.

/** At most this many children are listed (the answer says when there were more). */
export const REGISTRATION_CHECK_MAX = 10;
/** A name search needs at least this many letters (no enumeration with one or two). */
export const REGISTRATION_NAME_MIN = 3;

/** The letters and digits a search really matches on: tatweel, punctuation and wildcards do not count. */
export function searchChars(q: string): number {
  return normalizeArabic(q).replace(/[^\p{L}\p{N}]/gu, '').length;
}

/** `?phone=` or `?q=`, exactly one. 400 one_of, invalid_phone, query_too_short. */
export const registrationCheckQuerySchema = z
  .object({
    phone: z.string().trim().min(1).max(32).optional(),
    q: z.string().trim().max(100).optional(),
  })
  .transform((v, ctx) => {
    if (v.phone && !v.q) {
      const phone = phoneE164.safeParse(v.phone);
      if (!phone.success) {
        ctx.addIssue({ code: 'custom', message: 'invalid_phone', path: ['phone'] });
        return z.NEVER;
      }
      return { by: 'phone' as const, phone: phone.data };
    }
    if (v.q && !v.phone) {
      if (searchChars(v.q) < REGISTRATION_NAME_MIN) {
        ctx.addIssue({ code: 'custom', message: 'query_too_short', path: ['q'] });
        return z.NEVER;
      }
      return { by: 'name' as const, q: v.q };
    }
    ctx.addIssue({ code: 'custom', message: 'one_of', path: ['q'] });
    return z.NEVER;
  });
export type RegistrationCheckQuery = z.output<typeof registrationCheckQuerySchema>;

/** One registered child: exactly these four keys. */
export interface RegistrationMatch {
  name: string;
  code: string;
  status: StudentStatus;
  teacher_name: string | null;
}

/** GET /sales/registration-check. `more`: there were over REGISTRATION_CHECK_MAX matches. */
export interface RegistrationCheckView {
  found: boolean;
  matches: RegistrationMatch[];
  more: boolean;
}

/** The answer's shape from the rows read (already whitelisted), capped at REGISTRATION_CHECK_MAX. */
export function registrationView(rows: readonly RegistrationMatch[]): RegistrationCheckView {
  const matches = rows.slice(0, REGISTRATION_CHECK_MAX).map((r) => ({ name: r.name, code: r.code, status: r.status, teacher_name: r.teacher_name }));
  return { found: matches.length > 0, matches, more: rows.length > REGISTRATION_CHECK_MAX };
}
