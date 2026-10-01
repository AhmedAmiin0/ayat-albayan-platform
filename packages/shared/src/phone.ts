// Phone normalisation to E.164 (rule 7, R-STU-02).
export type PhoneCountry = 'SA' | 'EG';
export type PhoneResult =
  | { ok: true; e164: string; country: PhoneCountry | null }
  | { ok: false; reason: 'empty' | 'not_a_number' | 'invalid_length' | 'missing_country_code' };

/** Same rule as the DB domain `public.e164`. */
export const E164_RE = /^\+[1-9][0-9]{7,14}$/;

const SA_RE = /^\+9665[0-9]{8}$/; // mobiles: +966 5x xxx xxxx
const EG_RE = /^\+201[0-9]{9}$/; // mobiles: +20 1x xxxx xxxx
// Spaces, dashes, brackets, dots and the bidi marks WhatsApp copies along with numbers.
const NOISE = /[\s\-().‎‏‪-‮]/g;

function toAsciiDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** "+<digits>", or null when the number carries no country code. */
function withCountryCode(digits: string): string | null {
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('966')) return `+${digits}`;
  if (/^05[0-9]{8}$/.test(digits)) return `+966${digits.slice(1)}`;
  if (/^01[0-9]{9}$/.test(digits)) return `+20${digits.slice(1)}`;
  return null;
}

/**
 * Normalises a phone to E.164. Accepts +966 / 00966 / 966 / 05xxxxxxxx (Saudi),
 * +20 / 0020 / 01xxxxxxxxx (Egypt), and any other country written with + or 00.
 * Rejects handles, letters and short numbers.
 */
export function normalizePhone(input: string): PhoneResult {
  const cleaned = toAsciiDigits(input).replace(NOISE, '');
  if (!cleaned) return { ok: false, reason: 'empty' };
  if (!/^\+?[0-9]+$/.test(cleaned)) return { ok: false, reason: 'not_a_number' };

  const e164 = withCountryCode(cleaned);
  if (!e164) return { ok: false, reason: 'missing_country_code' };
  if (e164.startsWith('+966')) return SA_RE.test(e164) ? ok(e164, 'SA') : bad();
  if (e164.startsWith('+20')) return EG_RE.test(e164) ? ok(e164, 'EG') : bad();
  // TODO(R-STU-02): no country inference outside SA/EG; owner to say which countries matter.
  return E164_RE.test(e164) ? ok(e164, null) : bad();
}

function ok(e164: string, country: PhoneCountry | null): PhoneResult {
  return { ok: true, e164, country };
}

function bad(): PhoneResult {
  return { ok: false, reason: 'invalid_length' };
}
