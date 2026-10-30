import { E164_RE } from '../../core/format/phone.js';

// WA_ALLOWED_RECIPIENTS (docs/12 §13.5): the staging guard, parsed the same way by the API's env
// schema and the «التكاملات» form. Fail closed: nothing non-blank ever degrades to "unrestricted".

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
