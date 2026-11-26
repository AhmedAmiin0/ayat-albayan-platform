import type { Env } from '@/config/env/env';

// Staging guard (docs/12 §13.5) fails closed: an empty list never means everyone.

export { EMPTY_RECIPIENTS, parseAllowedRecipients } from '@ab/catalog';

/** null ONLY when WA_ALLOWED_RECIPIENTS is unset or blank (= no restriction). */
export function allowedRecipients(env: Env): readonly string[] | null {
  return env.WA_ALLOWED_RECIPIENTS ?? null;
}

/** null / undefined → true; [] → false; else the list holds `+` and the digits of `to`. */
export function recipientAllowed(
  allowed: readonly string[] | null | undefined,
  to: string,
): boolean {
  if (allowed === null || allowed === undefined) return true;
  return allowed.includes(`+${to.replace(/\D/g, '')}`);
}
