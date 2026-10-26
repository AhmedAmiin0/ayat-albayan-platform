import { z } from 'zod';
import { normalizePhone } from '../format/phone.js';

/** Any typed phone → E.164 (R-STU-02). The issue message is the PhoneResult reason. */
export const phoneE164 = z.string().transform((value, ctx) => {
  const r = normalizePhone(value);
  if (r.ok) return r.e164;
  ctx.addIssue({ code: 'custom', message: r.reason });
  return z.NEVER;
});

export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** IANA time zone, required on every person (R-SCH-01, rule 6). */
export const timeZone = z.string().refine(isTimeZone, { message: 'invalid_time_zone' });

/** Wall-clock "HH:MM" (24h) — never free text (rule 6). */
export const timeOfDay = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'invalid_time');

/** Trimmed non-empty text. */
export const requiredText = z.string().trim().min(1);
export const optionalText = z.string().trim().min(1).nullish();
