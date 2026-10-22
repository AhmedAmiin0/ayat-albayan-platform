import type { Attendance, Grade, Program } from '@ab/shared';
import { driveFileLink, fileIdIn } from '@ab/shared';
import { ar } from '../../common/i18n/server-text';
import type { CellValue, Rows } from './google-client.port';
import { sheetDate } from './sheet-dates';

/** One platform report as its attendance row needs it. */
export interface AttendanceInput {
  /** yyyy-mm-dd in Riyadh. */
  date: string;
  seq: number | null;
  teacherName: string;
  program: Program | null;
  attendance: Attendance | null;
  recited: string | null;
  newMemorization: string | null;
  revision: string | null;
  gradeOverall: Grade | null;
  notes: string | null;
  homework: string | null;
  meetingLink: string | null;
  pdfFileId: string;
}

/** USER_ENTERED would run a teacher's «=…» note as a formula: a leading quote keeps it text. */
export const textCell = (v: string | null): string => {
  const s = (v ?? '').trim();
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
};

/** The 13 columns of «سجل حضور — <student>», A..M (docs/24 §1). */
export function attendanceRow(r: AttendanceInput): CellValue[] {
  return [
    r.date,
    r.seq ?? '',
    textCell(r.teacherName),
    r.program ? ar.enums.program[r.program] : '',
    r.attendance ? ar.enums.attendance[r.attendance] : '',
    textCell(r.recited),
    textCell(r.newMemorization),
    textCell(r.revision),
    r.gradeOverall ? ar.enums.grade[r.gradeOverall] : '',
    textCell(r.notes),
    textCell(r.homework),
    textCell(r.meetingLink),
    driveFileLink(r.pdfFileId),
  ];
}

/** Where a date stands in the sheet: our own row (its PDF link is ours), the script's row, or none. */
export type DateMatch = { kind: 'ours'; row: number } | { kind: 'script' } | { kind: 'none' };

/** rows = A2:M (data rows, sheet row = index + 2). */
export function matchDate(rows: Rows, input: { date: string; pdfFileId: string | null }): DateMatch {
  let script = false;
  for (const [i, row] of rows.entries()) {
    if (sheetDate(row[0] ?? null) !== input.date) continue;
    if (input.pdfFileId && fileIdIn(row[12]) === input.pdfFileId) return { kind: 'ours', row: i + 2 };
    script = true;
  }
  return script ? { kind: 'script' } : { kind: 'none' };
}

/** First/last lesson date and the data-row count, recomputed from the attendance sheet (§2.6). */
export function attendanceStats(rows: Rows): { first: string | null; last: string | null; count: number } {
  const dates = rows.map((r) => sheetDate(r[0] ?? null)).filter((d): d is string => d !== null).sort();
  const count = rows.filter((r) => r.some((c) => c !== null && c !== '')).length;
  return { first: dates[0] ?? null, last: dates.at(-1) ?? null, count };
}
