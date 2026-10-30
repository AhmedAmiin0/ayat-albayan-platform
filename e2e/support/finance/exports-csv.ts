import { readFile } from 'node:fs/promises';
import type { Download } from '@playwright/test';

// Reading the dashboard's CSV downloads (A8). The API writes RFC 4180 (every field quoted, CRLF).

export const BOM = '﻿';

/** The downloaded file as text; the BOM stays (the specs assert it). */
export async function readDownload(download: Download): Promise<string> {
  const path = await download.path();
  return readFile(path, 'utf8');
}

/** Rows of cells; handles doubled quotes and line breaks inside quoted cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const body = text.startsWith(BOM) ? text.slice(1) : text;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body.charAt(i);
    if (quoted) {
      if (ch === '"' && body.charAt(i + 1) === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') cell += ch;
  }
  if (cell !== '' || row.length > 0) rows.push([...row, cell]);
  return rows;
}
