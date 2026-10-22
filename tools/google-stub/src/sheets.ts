// Sheets v4 values (A1 ranges on the first tab) and batchUpdate (accepted, counted).
import { notFound, readJson, type Cell, type Route } from './state.ts';

const col = (letters: string) => [...letters].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

function range(raw: string): { c0: number; r0: number; c1: number; r1: number | null } {
  const ref = decodeURIComponent(raw).split('!').at(-1) ?? '';
  const [a = '', b] = ref.split(':');
  const p = (x: string) => /^([A-Z]+)(\d+)?$/.exec(x);
  const s = p(a);
  const e = b ? p(b) : s;
  return { c0: col(s?.[1] ?? 'A'), r0: Number(s?.[2] ?? 1), c1: col(e?.[1] ?? 'Z'), r1: e?.[2] ? Number(e[2]) : null };
}

export const sheetRoutes: Route[] = [
  ['GET', /^\/v4\/spreadsheets\/([^/]+)\/values\/([^/:]+)$/, async (_r, { m, s }) => {
    const rows = s.sheets.get(decodeURIComponent(m[1] ?? ''));
    if (!rows) return notFound();
    const r = range(m[2] ?? '');
    const values = rows.slice(r.r0 - 1, r.r1 ?? undefined).map((row) => row.slice(r.c0, r.c1 + 1));
    return [200, { values }];
  }],
  ['POST', /^\/v4\/spreadsheets\/([^/]+)\/values\/([^/:]+):append$/, async (req, { m, s }) => {
    const rows = s.sheets.get(decodeURIComponent(m[1] ?? ''));
    if (!rows) return notFound();
    const { values } = await readJson<{ values: Cell[][] }>(req);
    rows.push(...values);
    return [200, { updates: { updatedRange: `Sheet1!A${rows.length}:M${rows.length}` } }];
  }],
  ['PUT', /^\/v4\/spreadsheets\/([^/]+)\/values\/([^/:]+)$/, async (req, { m, s }) => {
    const rows = s.sheets.get(decodeURIComponent(m[1] ?? ''));
    if (!rows) return notFound();
    const r = range(m[2] ?? '');
    const { values } = await readJson<{ values: Cell[][] }>(req);
    values.forEach((vals, i) => {
      const row = rows[r.r0 - 1 + i] ?? [];
      vals.forEach((v, j) => (row[r.c0 + j] = v));
      rows[r.r0 - 1 + i] = Array.from(row, (c) => c ?? '');
    });
    return [200, {}];
  }],
  ['POST', /^\/v4\/spreadsheets\/([^/:]+):batchUpdate$/, async (_r, { m, s }) => (s.sheets.has(decodeURIComponent(m[1] ?? '')) ? [200, {}] : notFound())],
];
