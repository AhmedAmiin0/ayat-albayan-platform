import { z } from 'zod';
import { registrationCheckQuerySchema } from '@ab/shared';
import type { RegistrationCheckBy, RegistrationCheckCode } from '@ab/shared';
import type { CheckRequest } from './registration-check.types';

// The same query rules as the API (docs/16 row 23), checked before any request.

const CODES = ['query_too_short', 'invalid_phone', 'one_of'] as const;
const codeSchema = z.enum(CODES);
const CHECK_BYS = ['phone', 'name'] as const;
const checkBySchema = z.enum(CHECK_BYS);

const askedAs = z.record(checkBySchema, z.enum(['phone', 'q'])).readonly().decode({
  phone: 'phone',
  name: 'q',
});
const fallbackCode = z.record(checkBySchema, codeSchema).readonly().decode({
  phone: 'invalid_phone',
  name: 'one_of',
});

const codeOf = (error: z.ZodError, by: RegistrationCheckBy): RegistrationCheckCode =>
  codeSchema.catch(fallbackCode[by]).parse(error.issues[0]?.message);

/** The query for a phone (normalised to E.164) or a name / code, or why it cannot be asked. */
export function checkRequest(by: RegistrationCheckBy, value: string): CheckRequest {
  const parsed = registrationCheckQuerySchema.safeParse({ [askedAs[by]]: value });
  if (!parsed.success) return { ok: false, code: codeOf(parsed.error, by) };
  const { by: asked, ...query } = parsed.data;
  return { ok: true, by: asked, query };
}
