// Sheets v4 values (A1 ranges on the first tab) and batchUpdate (accepted, counted).
import { notFound, readJson, type Route } from './state.ts';
import { valuesBody } from './stub.schemas.ts';

const col = (letters: string) =>
  letters.split('').reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

const CELL = /^([A-Z]+)(\d+)?$/;

/** One end of an A1 range: a missing column falls back to `fallback`, a missing row to null. */
function corner(ref: string, fallback: string): { col: number; row: number | null } {
  const m = CELL.exec(ref);
  const row = m?.[2];
  return { col: col(m?.[1] ?? fallback), row: row ? Number(row) : null };
}

function range(raw: string): { c0: number; r0: number; c1: number; r1: number | null } {
  const ref = decodeURIComponent(raw).split('!').at(-1) ?? '';
  const [a = '', b] = ref.split(':');
  const start = corner(a, 'A');
  const end = corner(b || a, 'Z');
  return { c0: start.col, r0: start.row ?? 1, c1: end.col, r1: end.row };
}

export const sheetRoutes: Route[] = [
  [
    'GET',
    /^\/v4\/spreadsheets\/([^/]+)\/values\/([^/:]+)$/,
    (_r, { m, s }) => {
      const rows = s.sheets.get(decodeURIComponent(m[1] ?? ''));
      if (!rows) return notFound();
      const r = range(m[2] ?? '');
      const values = rows
        .slice(r.r0 - 1, r.r1 ?? undefined)
        .map((row) => row.slice(r.c0, r.c1 + 1));
      return [200, { values }];
    },
  ],
  [
    'POST',
    /^\/v4\/spreadsheets\/([^/]+)\/values\/([^/:]+):append$/,
    async (req, { m, s }) => {
      const rows = s.sheets.get(decodeURIComponent(m[1] ?? ''));
      if (!rows) return notFound();
      const { values } = await readJson(req, valuesBody);
      rows.push(...values);
      return [200, { updates: { updatedRange: `Sheet1!A${rows.length}:M${rows.length}` } }];
    },
  ],
  [
    'PUT',
    /^\/v4\/spreadsheets\/([^/]+)\/values\/([^/:]+)$/,
    async (req, { m, s }) => {
      const rows = s.sheets.get(decodeURIComponent(m[1] ?? ''));
      if (!rows) return notFound();
      const r = range(m[2] ?? '');
      const { values } = await readJson(req, valuesBody);
      values.forEach((vals, i) => {
        const row = rows[r.r0 - 1 + i] ?? [];
        vals.forEach((v, j) => (row[r.c0 + j] = v));
        rows[r.r0 - 1 + i] = Array.from(row, (c) => c ?? '');
      });
      return [200, {}];
    },
  ],
  [
    'POST',
    /^\/v4\/spreadsheets\/([^/:]+):batchUpdate$/,
    (_r, { m, s }) => (s.sheets.has(decodeURIComponent(m[1] ?? '')) ? [200, {}] : notFound()),
  ],
];
