// The Drive and Sheets links the old script writes into its sheets (docs/24 §1): the attendance
// row's «تقرير PDF», the summary row's «مجلد الطالب» and «سجل الحضور». Ids only, never a name.

export const driveFileLink = (fileId: string): string => `https://drive.google.com/file/d/${fileId}/view`;
export const driveFolderLink = (folderId: string): string => `https://drive.google.com/drive/folders/${folderId}`;
export const sheetLink = (sheetId: string): string => `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;

const FOLDER = /\/folders\/([A-Za-z0-9_-]{10,})/;
const FILE = /\/(?:file|spreadsheets|document)\/d\/([A-Za-z0-9_-]{10,})/;
const OPEN = /[?&]id=([A-Za-z0-9_-]{10,})/;

/** The folder id inside a cell (a plain link or a =HYPERLINK("…") formula), or null. */
export function folderIdIn(cell: unknown): string | null {
  if (typeof cell !== 'string') return null;
  return FOLDER.exec(cell)?.[1] ?? OPEN.exec(cell)?.[1] ?? null;
}

/** The file or spreadsheet id inside a cell, or null. */
export function fileIdIn(cell: unknown): string | null {
  if (typeof cell !== 'string') return null;
  return FILE.exec(cell)?.[1] ?? OPEN.exec(cell)?.[1] ?? null;
}
