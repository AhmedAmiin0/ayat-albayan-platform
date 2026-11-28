import { DRIVE } from '@/modules/platform/google-sync/google-format';

const FIRST_PRINTABLE = 0x20;
const SEPARATORS = new Set(['/', '\\']);
const isUnsafe = (c: string): boolean =>
  SEPARATORS.has(c) || (c.codePointAt(0) ?? 0) < FIRST_PRINTABLE;
/** A file name never carries a path separator or a control character. */
const clean = (s: string): string =>
  Array.from(s, (c) => (isUnsafe(c) ? ' ' : c))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

/** Names like the old report flow, with a platform suffix when the sheet already has one (§2.5). */
export function pdfName(input: { student: string; date: string; alreadyInSheet: boolean }): string {
  const suffix = input.alreadyInSheet ? DRIVE.pdfPlatformSuffix : '';
  return `${clean(input.student)}${DRIVE.pdfSeparator}${input.date}${suffix}.pdf`;
}

export const studentFolderName = (student: string): string => clean(student);
export const attendanceSheetName = (student: string): string =>
  `${DRIVE.attendancePrefix}${clean(student)}`;
