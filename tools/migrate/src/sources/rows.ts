// Sheet grid → SourceRow[] by a SheetSpec. Pure: the zip/xlsx reading lives in zip.ts.
import { wallClock } from '../time.ts';
import type { Cell, SourceRow } from '../types.ts';
import type { SheetSpec } from './headers.ts';

/** Library cell → Cell: trimmed text ('' → null), dates as zone-less wall clock. */
export function cellOf(v: unknown): Cell {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return wallClock(v);
  if (typeof v === 'string') return v.trim() === '' ? null : v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  return String(v);
}

/** Header texts with repeats numbered: ['وقت البدء', 'وقت البدء'] → ['وقت البدء', 'وقت البدء 2']. */
export function headerNames(row: readonly unknown[]): string[] {
  const seen = new Map<string, number>();
  return row.map((h) => {
    const text = h === null || h === undefined ? '' : String(h).replace(/\s+/g, ' ').trim();
    if (!text) return '';
    const n = (seen.get(text) ?? 0) + 1;
    seen.set(text, n);
    return n > 1 ? `${text} ${n}` : text;
  });
}

function letterIndex(letter: string): number {
  return [...letter].reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
}

export interface SheetRowsResult {
  rows: SourceRow[];
  /** Spec headers not found: the owner changed the sheet; extraction should stop. */
  missing: string[];
  /** Non-empty headers neither mapped nor ignored (counts only go to the report). */
  unknown: string[];
}

export interface SheetRowsInput {
  spec: SheetSpec;
  data: readonly (readonly unknown[])[];
  /** Zip path, recorded on each row for multi-file specs. */
  file?: string;
}

export function sheetRows(input: SheetRowsInput): SheetRowsResult {
  const { spec, data, file } = input;
  const names = headerNames(data[spec.headerRow - 1] ?? []);
  const columns: [string, number][] = [];
  const missing: string[] = [];
  for (const [header, field] of Object.entries(spec.fields)) {
    const at = header.startsWith('@') ? letterIndex(header.slice(1)) : names.indexOf(header);
    if (at < 0) missing.push(header);
    else columns.push([field, at]);
  }
  const known = new Set([...Object.keys(spec.fields), ...(spec.ignore ?? [])]);
  const unknown = names.filter((n) => n && !known.has(n));
  const rows: SourceRow[] = [];
  data.slice(spec.headerRow).forEach((cells, i) => {
    const fields: Record<string, Cell> = {};
    for (const [field, at] of columns) fields[field] = cellOf(cells[at]);
    if (Object.values(fields).every((v) => v === null)) return;
    const ref = { source: spec.source, tab: spec.tab, row: spec.headerRow + i + 1 };
    rows.push({ ref: file && typeof spec.file !== 'string' ? { ...ref, file } : ref, fields });
  });
  return { rows, missing, unknown };
}
