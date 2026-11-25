import { clipText } from '@ab/shared';
import type { AnyPushKind } from '@ab/catalog';
import { pushText, type PushText } from '@/common/push/expo/expo-push';

// What a device shows on its lock screen: no more personal data than the alert
// needs. The bell row keeps the full text: it is read only inside the app, after sign-in.

/**
 * A run of 7+ digits (Latin, Arabic-Indic or Persian; spaces, dashes, dots, brackets between): a
 * phone.
 */
const PHONE = /\+?[\d٠-٩۰-۹](?:[\d٠-٩۰-۹\s.()-]{5,}[\d٠-٩۰-۹])/g;
/** A sum with its currency on either side (Latin and Arabic-Indic digits). */
const AMOUNT =
  /(?:[$€£]|\b(?:USD|EGP|SAR|AED|KWD)\b)\s?[\d٠-٩][\d٠-٩.,]*|[\d٠-٩][\d٠-٩.,]*\s?(?:[$€£]|\b(?:USD|EGP|SAR|AED|KWD)\b|ج\.م|جنيه|ريال|ر\.س|دولار|درهم)/giu;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const NAME_SLOTS: ReadonlySet<string> = new Set(['name', 'student', 'teacher']);
/** A sum slot is masked whole, whatever its currency (AMOUNT knows a few codes only). */
const MONEY_SLOTS: ReadonlySet<string> = new Set(['amount']);
/** Free text a person typed (an inbox message, a cancel reason): redacted, then clipped. */
const CLIPPED_SLOTS: ReadonlySet<string> = new Set(['text', 'reason']);
/** The quoted message in an inbox alert. */
export const PREVIEW_MAX = 60;

/** The last 4 digits stay: enough to tell two numbers apart, not enough to dial. */
function maskPhone(match: string): string {
  const digits = match.replace(/[^\d٠-٩۰-۹]/g, '');
  return digits.length < 7 ? match : `•••${digits.slice(-4)}`;
}

/** Phones, sums and email addresses out of any shown string. Pure. */
export function redact(text: string): string {
  return text.replace(EMAIL, '•••').replace(AMOUNT, '•••').replace(PHONE, maskPhone);
}

/** Compound first names, titles and role words where the first word alone means nothing. */
const NAME_PREFIXES: ReadonlySet<string> = new Set([
  'عبد', 'أبو', 'ابو', 'أبي', 'أم', 'ام', 'أ.', 'ولي', 'مسؤول',
]);

function firstName(value: string): string {
  const [first = value, second] = value.trim().split(/\s+/);
  return second !== undefined && NAME_PREFIXES.has(first) ? `${first} ${second}` : first;
}

const firstNames = (value: string) => value.split(/،| و/).map(firstName).join(' و');

const clip = (text: string) => clipText(text, PREVIEW_MAX);

function lockVar(key: string, value: string | number): string | number {
  if (MONEY_SLOTS.has(key)) return '•••';
  // A lesson time is ours, never personal (and a date must not read as a phone number).
  if (typeof value === 'number' || key === 'when') return value;
  const shown = redact(value);
  if (NAME_SLOTS.has(key)) return firstNames(shown);
  return CLIPPED_SLOTS.has(key) ? clip(shown) : shown;
}

/** The device text of a notification: names cut to a first name, phones/sums/emails masked. */
export function lockScreenText(input: { kind: AnyPushKind; vars: Record<string, string | number>; title?: string | undefined }): PushText {
  const vars = Object.fromEntries(Object.entries(input.vars).map(([k, v]) => [k, lockVar(k, v)]));
  const text = pushText(input.kind, vars);
  return { title: input.title ? redact(input.title) : text.title, body: text.body };
}
