import { asciiDigits } from '@ab/core';
import { addCalendarDays, localDateIn } from '@ab/time';
import type { CellValue } from '@/modules/platform/google-sync/google-client.port';

// Serial dates count from 1899-12-30; text dates are parsed; all become yyyy-mm-dd or null.

/** Day 0 of a Sheets serial date. */
const EPOCH = '1899-12-30';
const pad = (n: number): string => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number): string | null =>
  m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100 ? `${y}-${pad(m)}-${pad(d)}` : null;

export function sheetDate(cell: CellValue): string | null {
  if (typeof cell === 'number' && cell > 30_000 && cell < 80_000) {
    return addCalendarDays(EPOCH, Math.floor(cell));
  }
  if (typeof cell !== 'string') return null;
  // Arabic-Indic and Persian digits become ASCII so localized dates parse.
  const s = asciiDigits(cell.trim());
  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (iso) return ymd(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const dmy = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(s);
  if (dmy) return ymd(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
  return null;
}

/** The date in a time zone, yyyy-mm-dd (the report's lesson day in Riyadh). */
export function localDate(at: string, tz: string): string {
  return localDateIn(new Date(at), tz);
}
