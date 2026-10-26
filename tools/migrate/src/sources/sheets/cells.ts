// Sheet cell → typed value helpers shared by every sheet mapper. Pure.
import { normalizePhone } from '@ab/shared';
import type { Cell } from '../../types.ts';

// Bidi marks WhatsApp/Sheets paste around numbers and names.
const BIDI = /[‎‏‪-‮⁦-⁩]/g;

/** Trimmed text; '', '—', '-' and lone commas (empty multi-selects) → null. */
export function text(v: Cell | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(BIDI, '').trim();
  return /^[—\-–,،]*$/.test(s) ? null : s;
}

/** Number cell or numeric text («45 دقيقة» → 45); null otherwise. */
export function num(v: Cell | undefined): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const m = /-?\d+(?:\.\d+)?/.exec(text(v) ?? '');
  return m ? Number(m[0]) : null;
}

type PhoneCell =
  | { ok: true; e164: string }
  | { ok: false; reason: 'empty' | 'not_a_number' | 'missing_country_code' | 'invalid_length' };

/**
 * A8: the sheets hold 9665…, 966 5…, +966 5…, 05…, 01…, «@handle», «#ERROR!». Bare international
 * numbers lost their «+» (handbook gotcha 3) so it is added back. Two Egyptian shapes are repaired:
 * the trunk zero kept after the code (20 0 1x…) and a bare mobile without the 0 (1[0125] + 8
 * digits, a shape no valid +1 number has). Any other bare number shorter than 11 digits has no
 * country code and is rejected, never guessed. The CRM path (map/leads/phone.ts) uses this too.
 */
export function phoneCell(v: Cell | undefined): PhoneCell {
  const raw = text(v);
  if (!raw) return { ok: false, reason: 'empty' };
  const compact = egyptian(raw.replace(/[\s\-().]/g, ''));
  if (!/^\+?\d+$/.test(compact)) return { ok: false, reason: 'not_a_number' };
  const local = /^(?:\+|00|0)/.test(compact);
  if (!local && compact.length < 11) return { ok: false, reason: 'missing_country_code' };
  const r = normalizePhone(local ? compact : `+${compact}`);
  return r.ok ? { ok: true, e164: r.e164 } : { ok: false, reason: r.reason };
}

function egyptian(compact: string): string {
  const trunk = /^(?:\+|00)?200(1[0125]\d{8})$/.exec(compact);
  if (trunk) return `+20${trunk[1]}`;
  return /^1[0125]\d{8}$/.test(compact) ? `+20${compact}` : compact;
}

export { DEFAULT_TZ, personTz, tzForPhone } from './tz.ts';

/** «AB-0042» anywhere in the text (booking notes carry it as «… · AB-0042 · …») → 42. */
export function legacyCode(v: Cell | undefined): number | null {
  const m = /AB-(\d{1,6})/.exec(text(v) ?? '');
  return m ? Number(m[1]) : null;
}

/** '9:30' → '09:30'; null when not a valid wall-clock time (gotcha 7: 38 unpadded values). */
export function hhmm(v: Cell | undefined): string | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(text(v) ?? '');
  if (!m) return null;
  const [h, mi] = [Number(m[1]), Number(m[2])];
  return h < 24 && mi < 60 ? `${String(h).padStart(2, '0')}:${m[2]}` : null;
}

/** 'YYYY-MM-DD' prefix of a date or datetime cell, else null. */
export function ymd(v: Cell | undefined): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(text(v) ?? '');
  return m?.[1] ?? null;
}

/** Wall-clock 'YYYY-MM-DDTHH:mm:ss' → its parts, or null. */
export function dateTime(v: Cell | undefined): { date: string; time: string; sec: number } | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?/.exec(text(v) ?? '');
  return m?.[1] && m[2] ? { date: m[1], time: m[2], sec: Number(m[3] ?? 0) } : null;
}

/** First non-null text among cells (A9: the same question under two headers). */
export function firstText(...cells: (Cell | undefined)[]): string | null {
  for (const c of cells) {
    const t = text(c);
    if (t) return t;
  }
  return null;
}
