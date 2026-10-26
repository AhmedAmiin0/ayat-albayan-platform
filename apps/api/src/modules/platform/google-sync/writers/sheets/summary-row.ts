import { driveFolderLink, folderIdIn, normalizeArabic, sheetLink, type Program } from '@ab/shared';
import { ar } from '../../../../../common/i18n/server-text';
import type { CellValue, Rows } from '../../google-client.port';

// «سجل الطلاب المشتركين» (docs/24 §2.6): the platform upserts ONLY the row of a student it writes
// for, matched by the folder link (column G) first, then by the normalised Arabic name (column A).
// It recomputes first/last/count from that student's attendance sheet, so whatever the old script
// does to the same row stays consistent. A new student gets a new row.

export interface SummaryStudent {
  name: string;
  teacherName: string;
  program: Program | null;
  folderId: string;
  attendanceSheetId: string;
}

export interface SummaryStats {
  first: string | null;
  last: string | null;
  count: number;
}

/** rows = A2:H (sheet row = index + 2). The sheet row of this student, or null. */
export function findSummaryRow(rows: Rows, s: Pick<SummaryStudent, 'name' | 'folderId'>): number | null {
  const byFolder = rows.findIndex((r) => folderIdIn(r[6]) === s.folderId);
  if (byFolder >= 0) return byFolder + 2;
  const name = normalizeArabic(s.name);
  const byName = name ? rows.findIndex((r) => typeof r[0] === 'string' && normalizeArabic(r[0]) === name) : -1;
  return byName >= 0 ? byName + 2 : null;
}

/** A new student's whole row, A..H. */
export function newSummaryRow(s: SummaryStudent, stats: SummaryStats): CellValue[] {
  return [
    s.name,
    s.teacherName,
    s.program ? ar.enums.program[s.program] : '',
    stats.first ?? '',
    stats.last ?? '',
    stats.count,
    driveFolderLink(s.folderId),
    sheetLink(s.attendanceSheetId),
  ];
}

/**
 * The cells the platform rewrites on an existing row: D..F always (recomputed), G and H only
 * where they are blank. A..C (name, teacher, program) stay as the script wrote them.
 */
export function summaryUpdates(existing: readonly CellValue[], s: SummaryStudent, stats: SummaryStats): { range: string; values: CellValue[] }[] {
  const out = [{ range: 'D', values: [stats.first ?? '', stats.last ?? '', stats.count] as CellValue[] }];
  const blank = (c: CellValue | undefined) => c === undefined || c === null || c === '';
  if (blank(existing[6])) out.push({ range: 'G', values: [driveFolderLink(s.folderId)] });
  if (blank(existing[7])) out.push({ range: 'H', values: [sheetLink(s.attendanceSheetId)] });
  return out;
}

/** The summary sheet's rows that point at a folder, for discovery's student suggestions. */
export function summaryLinks(rows: Rows): { name: string; folderId: string; sheetId: string | null }[] {
  return rows.flatMap((r) => {
    const folderId = folderIdIn(r[6]);
    const name = typeof r[0] === 'string' ? r[0].trim() : '';
    if (!folderId || !name) return [];
    const sheet = typeof r[7] === 'string' ? /\/spreadsheets\/d\/([A-Za-z0-9_-]{10,})/.exec(r[7])?.[1] ?? null : null;
    return [{ name, folderId, sheetId: sheet }];
  });
}
