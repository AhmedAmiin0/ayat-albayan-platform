import { readFile } from 'node:fs/promises';
import type { Download } from '@playwright/test';

// Reading the dashboard's CSV downloads (A8). The API writes RFC 4180 (every field quoted, CRLF).

export const BOM = '﻿';

/** The downloaded file as text; the BOM stays (the specs assert it). */
export async function readDownload(download: Download): Promise<string> {
  const path = await download.path();
  return readFile(path, 'utf8');
}

interface CsvState {
  rows: string[][];
  row: string[];
  cell: string;
  quoted: boolean;
}

const endCell = (s: CsvState): void => {
  s.row.push(s.cell);
  s.cell = '';
};

const endRow = (s: CsvState): void => {
  endCell(s);
  s.rows.push(s.row);
  s.row = [];
};

const PLAIN = new Map<string, (s: CsvState) => void>([
  ['"', (s) => (s.quoted = true)],
  [',', endCell],
  ['\n', endRow],
  ['\r', () => undefined],
]);

/** One character inside quotes; returns how many characters it used. */
function quotedStep(s: CsvState, ch: string, next: string): number {
  if (ch !== '"') {
    s.cell += ch;
    return 1;
  }
  const doubled = next === '"';
  s.cell += doubled ? '"' : '';
  s.quoted = doubled;
  return doubled ? 2 : 1;
}

function step(s: CsvState, body: string, i: number): number {
  const ch = body.charAt(i);
  if (s.quoted) return quotedStep(s, ch, body.charAt(i + 1));
  (PLAIN.get(ch) ?? ((st: CsvState) => (st.cell += ch)))(s);
  return 1;
}

/** Rows of cells; handles doubled quotes and line breaks inside quoted cells. */
export function parseCsv(text: string): string[][] {
  const s: CsvState = { rows: [], row: [], cell: '', quoted: false };
  const body = text.startsWith(BOM) ? text.slice(1) : text;
  for (let i = 0; i < body.length;) i += step(s, body, i);
  if (s.cell !== '' || s.row.length > 0) s.rows.push([...s.row, s.cell]);
  return s.rows;
}
