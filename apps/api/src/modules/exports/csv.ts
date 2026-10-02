import { clockTime, RIYADH_TZ } from '@ab/shared';
import { riyadhDate } from '../dashboard/range';

// CSV for Excel (R-RPT-03, docs/11 §9): UTF-8 with a BOM so Excel opens Arabic correctly,
// RFC 4180 (every field quoted, quotes doubled, CRLF rows; line breaks stay inside the quotes).

export type Cell = string | number | null;

const BOM = '﻿';

function quote(v: Cell): string {
  const s = v === null ? '' : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(rows: readonly (readonly Cell[])[]): string {
  return BOM + rows.map((r) => r.map(quote).join(',')).join('\r\n') + '\r\n';
}

/**
 * Text people typed (names from WhatsApp, notes): a leading = + - @ (or tab/CR) would run as a
 * formula when the file is opened in Excel (CSV injection), so it is prefixed with an apostrophe.
 * Not for E.164 phones, which are written as-is (docs/11 §9).
 */
export function safeText(v: string | null | undefined): string {
  if (!v) return '';
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

/** An instant as Riyadh "YYYY-MM-DD HH:MM". */
export function riyadhStamp(iso: string | null): string {
  if (!iso) return '';
  return `${riyadhDate(iso)} ${clockTime(new Date(iso), RIYADH_TZ)}`;
}

/** `Content-Disposition` for a download; the name is ASCII (dates and a slug), so no encoding. */
export function attachment(filename: string): string {
  return `attachment; filename="${filename}"`;
}
