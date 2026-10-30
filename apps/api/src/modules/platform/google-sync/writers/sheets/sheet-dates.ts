import { asciiDigits } from '@ab/shared';
import type { CellValue } from '../../google-client.port';

// Column A of «سجل حضور — <student>» holds the lesson date as the script wrote it. Read with
// UNFORMATTED_VALUE a real date is a serial number (days since 1899-12-30); text dates are parsed
// in the shapes the sheets use. Everything becomes yyyy-mm-dd, or null for anything else.

const EPOCH = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;
const pad = (n: number): string => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number): string | null =>
  m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100 ? `${y}-${pad(m)}-${pad(d)}` : null;

export function sheetDate(cell: CellValue): string | null {
  if (typeof cell === 'number' && cell > 30_000 && cell < 80_000) {
    return new Date(EPOCH + Math.floor(cell) * DAY_MS).toISOString().slice(0, 10);
  }
  if (typeof cell !== 'string') return null;
  // Arabic-Indic and Persian digits → ASCII, so «٢٠٢٦/١٠/٢١» parses too.
  const s = asciiDigits(cell.trim());
  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (iso) return ymd(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const dmy = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(s);
  if (dmy) return ymd(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
  return null;
}

/** The date in a time zone, yyyy-mm-dd (the report's lesson day in Riyadh). */
export function localDate(at: string, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(at));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
