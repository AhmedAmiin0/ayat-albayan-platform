import type { PushKind } from '@ab/shared';
import { pushText, type PushText } from './expo-push';

// What a device shows on its lock screen (owner 2026-10-25): no more personal data than the alert
// needs. The bell row keeps the full text: it is read only inside the app, after sign-in.

/** A run of 7+ digits (spaces, dashes, dots allowed between): a phone or account number. */
const PHONE = /\+?\d(?:[\d\s.-]{5,}\d)/g;
/** A sum with its currency on either side (Latin and Arabic-Indic digits). */
const AMOUNT =
  /(?:[$€£]|\b(?:USD|EGP|SAR|AED|KWD)\b)\s?[\d٠-٩][\d٠-٩.,]*|[\d٠-٩][\d٠-٩.,]*\s?(?:[$€£]|\b(?:USD|EGP|SAR|AED|KWD)\b|ج\.م|جنيه|ريال|ر\.س|دولار|درهم)/giu;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
/** Single-person name slots: their first word only. Lists (joinNames: «،» or « و») stay as they are. */
const NAME_SLOTS: ReadonlySet<string> = new Set(['name', 'student', 'teacher']);
/** The quoted message in an inbox alert. */
export const PREVIEW_MAX = 60;

/** The last 4 digits stay: enough to tell two numbers apart, not enough to dial. */
function maskPhone(match: string): string {
  const digits = match.replace(/\D/g, '');
  return digits.length < 7 ? match : `•••${digits.slice(-4)}`;
}

/** Phones, sums and email addresses out of any shown string. Pure. */
export function redact(text: string): string {
  return text.replace(EMAIL, '•••').replace(AMOUNT, '•••').replace(PHONE, maskPhone);
}

function firstName(value: string): string {
  if (/،| و/.test(value)) return value;
  return value.trim().split(/\s+/)[0] ?? value;
}

const clip = (text: string) => (text.length > PREVIEW_MAX ? `${text.slice(0, PREVIEW_MAX - 1)}…` : text);

function lockVar(key: string, value: string | number): string | number {
  // A lesson time is ours, never personal (and a date must not read as a phone number).
  if (typeof value === 'number' || key === 'when') return value;
  const shown = redact(value);
  if (NAME_SLOTS.has(key)) return firstName(shown);
  return key === 'text' ? clip(shown) : shown;
}

/** The device text of a notification: names cut to a first name, phones/sums/emails masked. */
export function lockScreenText(input: { kind: PushKind; vars: Record<string, string | number>; title?: string | undefined }): PushText {
  const vars = Object.fromEntries(Object.entries(input.vars).map(([k, v]) => [k, lockVar(k, v)]));
  const text = pushText(input.kind, vars);
  return { title: input.title ? redact(input.title) : text.title, body: text.body };
}
