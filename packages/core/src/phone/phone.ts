import { asciiDigits } from '../text/index.js';

// Phone normalisation to E.164 (rule 7, R-STU-02).

export type PhoneCountry = 'SA' | 'EG' | 'AE' | 'QA' | 'KW' | 'OM';
export type PhoneResult =
  | { ok: true; e164: string; country: PhoneCountry | null }
  | { ok: false; reason: 'empty' | 'not_a_number' | 'invalid_length' | 'missing_country_code' };

/** Same rule as the DB domain `public.e164`. */
export const E164_RE = /^\+[1-9][0-9]{7,14}$/;

/**
 * Inferred countries by calling code, with the numbers each accepts: SA/EG mobiles only
 * (+966 5x xxx xxxx, +20 1x xxxx xxxx); Gulf by national length (QA/KW/OM 8, AE 8–9).
 * These are the pricing countries (docs/08 §1) plus Egypt; every other code → country null.
 */
const COUNTRIES: readonly (readonly [string, PhoneCountry, RegExp])[] = [
  ['+966', 'SA', /^\+9665[0-9]{8}$/],
  ['+20', 'EG', /^\+201[0-9]{9}$/],
  ['+971', 'AE', /^\+971[0-9]{8,9}$/],
  ['+974', 'QA', /^\+974[0-9]{8}$/],
  ['+965', 'KW', /^\+965[0-9]{8}$/],
  ['+968', 'OM', /^\+968[0-9]{8}$/],
];
// Spaces, dashes, brackets, dots and the bidi marks WhatsApp copies along with numbers.
const NOISE = /[\s\-().‎‏‪-‮]/g;

type PhoneFailure = Extract<PhoneResult, { ok: false }>['reason'];

/** How a cleaned number may be written, each to its "+<digits>" form; the first match wins. */
const WRITTEN_FORMS: readonly (readonly [RegExp, (digits: string) => string])[] = [
  [/^\+/, (d) => d],
  [/^00/, (d) => `+${d.slice(2)}`],
  [/^966/, (d) => `+${d}`],
  // Bare 20 + Egyptian mobile, the WhatsApp wa_id shape: no local format starts with 2. Same 1x
  // set as the EG pattern and the 01… form, so a number is accepted however it is written.
  [/^201[0-9]{9}$/, (d) => `+${d}`],
  [/^05[0-9]{8}$/, (d) => `+966${d.slice(1)}`],
  [/^01[0-9]{9}$/, (d) => `+20${d.slice(1)}`],
];

/**
 * "+<digits>", or null when the number carries no country code. R-STU-02: other bare
 * international numbers (971…, 44…) stay rejected, as they read like local numbers; the
 * WhatsApp webhook knows wa_id is international and adds the +.
 */
function withCountryCode(digits: string): string | null {
  const form = WRITTEN_FORMS.find(([re]) => re.test(digits));
  return form ? form[1](digits) : null;
}

/** What makes a cleaned input no phone number at all, checked in order. */
const INPUT_FAILURES: readonly (readonly [(cleaned: string) => boolean, PhoneFailure])[] = [
  [(c) => c === '', 'empty'],
  [(c) => !/^\+?[0-9]+$/.test(c), 'not_a_number'],
];

/** A number with its country code, held to its country's pattern (any other: E.164 alone). */
function checkedE164(e164: string | null): PhoneResult {
  if (e164 === null) return bad('missing_country_code');
  const known = COUNTRIES.find(([code]) => e164.startsWith(code));
  const pattern = known ? known[2] : E164_RE;
  return pattern.test(e164) ? ok(e164, known ? known[1] : null) : bad('invalid_length');
}

/**
 * Normalises a phone to E.164. Accepts +966 / 00966 / 966 / 05xxxxxxxx (Saudi),
 * +20 / 0020 / 201xxxxxxxxx (bare mobile, as WhatsApp sends it) / 01xxxxxxxxx (Egypt),
 * and any other country written with + or 00.
 * Rejects handles, letters and short numbers.
 */
export function normalizePhone(input: string): PhoneResult {
  const cleaned = asciiDigits(input).replace(NOISE, '');
  const failure = INPUT_FAILURES.find(([fails]) => fails(cleaned));
  return failure ? bad(failure[1]) : checkedE164(withCountryCode(cleaned));
}

/**
 * The phone part of a list search box (R-STU-02, R-LEAD-01): the digits to find inside phone_e164,
 * or null to search by name. Typed on any keyboard (Arabic-Indic and Persian digits, spaces,
 * dashes, dots, brackets, +), at least 3 digits. A local number (one leading 0, e.g. 05… or 01…)
 * → its national digits, so it is found under any country code (a UAE 05… is not read as Saudi);
 * a whole international number → its E.164 digits; a partial one → its digits without a leading
 * 00.
 */
export function searchDigits(term: string): string | null {
  const digits = asciiDigits(term).replace(NOISE, '').replace(/\+/g, '');
  if (!/^[0-9]{3,}$/.test(digits)) return null;
  if (/^0[1-9]/.test(digits)) return digits.slice(1);
  const whole = normalizePhone(term);
  return whole.ok ? whole.e164.slice(1) : digits.replace(/^00?/, '');
}

function ok(e164: string, country: PhoneCountry | null): PhoneResult {
  return { ok: true, e164, country };
}

function bad(reason: PhoneFailure): PhoneResult {
  return { ok: false, reason };
}

// National-number grouping per country code: SA +966 5x xxx xxxx, EG +20 1x xxxx xxxx, Gulf 4-4.
const GROUPS: readonly (readonly [string, readonly number[]])[] = [
  ['+966', [2, 3, 4]],
  ['+20', [2, 4, 4]],
  ['+974', [4, 4]],
  ['+968', [4, 4]],
  ['+965', [4, 4]],
  ['+973', [4, 4]],
];

/**
 * Display-only grouping of an E.164 number: «+966 55 214 7730». Storage, wa.me and tel: links
 * keep the raw E.164 (rule 7). Other countries and odd lengths come back unchanged.
 */
export function formatPhone(e164: string): string {
  for (const [cc, sizes] of GROUPS) {
    const rest = e164.slice(cc.length);
    if (
      !e164.startsWith(cc) ||
      !/^[0-9]+$/.test(rest) ||
      rest.length !== sizes.reduce((a, b) => a + b, 0)
    )
      continue;
    const parts = [cc];
    let at = 0;
    for (const n of sizes) {
      parts.push(rest.slice(at, at + n));
      at += n;
    }
    return parts.join(' ');
  }
  return e164;
}

/**
 * R-MSG-03 fallback: «https://wa.me/966598917071?text=…» with the text prefilled. No URL /
 * URLSearchParams: @ab/core also runs on Hermes. wa.me wants the number without the +.
 */
export function clickToChatLink(phoneE164: string, text?: string): string {
  const base = `https://wa.me/${phoneE164.replace(/\D/g, '')}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
