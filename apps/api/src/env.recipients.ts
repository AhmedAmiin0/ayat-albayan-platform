import { E164_RE } from '@ab/shared';
import type { Env } from './env';

// WA_ALLOWED_RECIPIENTS (docs/12 §13.5): the staging guard. Fail closed: nothing non-blank ever
// degrades to "unrestricted", and an empty list never means "everyone".

/** `bad` when the list is non-blank but holds no item at all (`,` or ` , `). */
export const EMPTY_RECIPIENTS = '(no number in the list)';

/** Meta shows «+20 100 123 4567»; Graph payloads carry no `+`. */
function normalise(item: string): string {
  const compact = item.replace(/[\s\-.()]/g, '');
  return compact.startsWith('+') ? compact : `+${compact}`;
}

/**
 * Splits on `,`, trims, drops empty items (a trailing comma is fine), normalises and de-dups.
 * `bad` = the first item (as typed, trimmed) that is not E.164, or EMPTY_RECIPIENTS.
 */
export function parseAllowedRecipients(raw: string): { items: string[]; bad: string | null } {
  const typed = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
  if (typed.length === 0) return { items: [], bad: EMPTY_RECIPIENTS };
  const wrong = typed.find((s) => !E164_RE.test(normalise(s)));
  if (wrong !== undefined) return { items: [], bad: wrong };
  return { items: [...new Set(typed.map(normalise))], bad: null };
}

/** null ONLY when WA_ALLOWED_RECIPIENTS is unset or blank (= no restriction). */
export function allowedRecipients(env: Env): readonly string[] | null {
  return env.WA_ALLOWED_RECIPIENTS ?? null;
}

/** null / undefined → true; [] → false; else the list holds `+` and the digits of `to`. */
export function recipientAllowed(allowed: readonly string[] | null | undefined, to: string): boolean {
  if (allowed === null || allowed === undefined) return true;
  return allowed.includes(`+${to.replace(/\D/g, '')}`);
}
