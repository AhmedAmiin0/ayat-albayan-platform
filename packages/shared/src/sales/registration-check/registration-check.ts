import { z } from 'zod';
import { normalizeArabic, phoneE164 } from '@ab/core';
import type { RegistrationCheckView, RegistrationMatch } from './registration-check.schemas';

// Registration check (docs/16 row 23): answer is name, code, status and teacher only.

/** At most this many children are listed (the answer says when there were more). */
export const REGISTRATION_CHECK_MAX = 10;
/** A name search needs at least this many letters (no enumeration with one or two). */
export const REGISTRATION_NAME_MIN = 3;

/** The letters and digits a search matches on: tatweel, punctuation and wildcards do not count. */
export function searchChars(q: string): number {
  return normalizeArabic(q).replace(/[^\p{L}\p{N}]/gu, '').length;
}

const rawQuerySchema = z.object({
  phone: z.string().trim().min(1).max(32).optional(),
  q: z.string().trim().max(100).optional(),
});
type RawQuery = z.output<typeof rawQuerySchema>;

function refuse(ctx: z.RefinementCtx, message: string, field: keyof RawQuery): never {
  ctx.addIssue({ code: 'custom', message, path: [field] });
  return z.NEVER;
}

const onlyPhone = (v: RawQuery): boolean => Boolean(v.phone) && !v.q;
const onlyName = (v: RawQuery): boolean => Boolean(v.q) && !v.phone;

function byPhone(v: RawQuery, ctx: z.RefinementCtx) {
  const phone = phoneE164.safeParse(v.phone);
  const found = { by: 'phone' as const, phone: phone.data ?? '' };
  return phone.success ? found : refuse(ctx, 'invalid_phone', 'phone');
}

function byName(v: RawQuery, ctx: z.RefinementCtx) {
  const q = v.q ?? '';
  const tooShort = searchChars(q) < REGISTRATION_NAME_MIN;
  return tooShort ? refuse(ctx, 'query_too_short', 'q') : { by: 'name' as const, q };
}

const byNameOrNone = (v: RawQuery, ctx: z.RefinementCtx) =>
  onlyName(v) ? byName(v, ctx) : refuse(ctx, 'one_of', 'q');

/** `?phone=` or `?q=`, exactly one. 400 one_of, invalid_phone, query_too_short. */
export const registrationCheckQuerySchema = rawQuerySchema.transform((v, ctx) =>
  onlyPhone(v) ? byPhone(v, ctx) : byNameOrNone(v, ctx),
);
export type RegistrationCheckQuery = z.output<typeof registrationCheckQuerySchema>;
export type RegistrationCheckBy = RegistrationCheckQuery['by'];
/** The 400 codes the query schema answers with. */
export type RegistrationCheckCode = 'query_too_short' | 'invalid_phone' | 'one_of';

/** The answer from the rows read (already whitelisted), capped at REGISTRATION_CHECK_MAX. */
export function registrationView(rows: readonly RegistrationMatch[]): RegistrationCheckView {
  const matches = rows
    .slice(0, REGISTRATION_CHECK_MAX)
    .map((r) => ({ name: r.name, code: r.code, status: r.status, teacher_name: r.teacher_name }));
  return { found: matches.length > 0, matches, more: rows.length > REGISTRATION_CHECK_MAX };
}
