import { DRIVE } from './google-format';

/** A file name never carries a path separator or a control character. */
// eslint-disable-next-line no-control-regex -- control characters are exactly what is stripped
const clean = (s: string): string => s.replace(/[\\/\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * «<student> — <yyyy-mm-dd>.pdf» as the old report flow names it; « (المنصة)» before .pdf when the
 * old script already has a report of that student and date in the attendance sheet (§2.5).
 */
export function pdfName(input: { student: string; date: string; alreadyInSheet: boolean }): string {
  const suffix = input.alreadyInSheet ? DRIVE.pdfPlatformSuffix : '';
  return `${clean(input.student)}${DRIVE.pdfSeparator}${input.date}${suffix}.pdf`;
}

export const studentFolderName = (student: string): string => clean(student);
export const attendanceSheetName = (student: string): string => `${DRIVE.attendancePrefix}${clean(student)}`;
