// Report PDFs in the Drive export: «تقارير آيات البيان/<student folder>/<name> — YYYY-MM-DD.pdf»
// (122), a few loose in the root folder (14), some re-downloads «… (1).pdf». Listed by
// extract-sheets in cache/sheets/files.json; plan/run.ts exposes them as bundle.sheets[ZIP_FILES].
import type { ZipEntryInfo } from '../sources/zip.ts';
import type { SourceRow } from '../types.ts';

export const ZIP_FILES = 'zip_files';
const ROOT = 'تقارير آيات البيان/';

export function zipFileRows(entries: readonly ZipEntryInfo[]): SourceRow[] {
  return entries.map((e, i) => ({
    ref: { source: 'ATT', tab: 'zip', row: i + 1, file: e.name },
    fields: { name: e.name, size: e.size },
  }));
}

export interface PdfName {
  path: string;
  /** Student folder, or null for a PDF loose in the root folder. */
  folder: string | null;
  /** Name part of the file name (before « — »). */
  person: string;
  /** Lesson day from the file name ('YYYY-MM-DD', Asia/Riyadh wall clock). */
  date: string;
  /** 0 for «x.pdf», n for the re-download «x (n).pdf». */
  copy: number;
}

const FILE = /^(.*?)\s*[—–-]\s*(\d{4}-\d{2}-\d{2})\s*(?:\((\d+)\))?\.pdf$/i;

export const isPdf = (path: string): boolean => path.startsWith(ROOT) && /\.pdf$/i.test(path);

/** undefined when the path is no report PDF, sits deeper than one folder, or has no date. */
export function parsePdfName(path: string): PdfName | undefined {
  const parts = isPdf(path) ? path.slice(ROOT.length).split('/') : [];
  const [folder, file] = parts.length === 2 ? parts : [null, parts[0]];
  const m = parts.length <= 2 ? FILE.exec(file ?? '') : null;
  if (!m) return undefined;
  const [, person = '', date = '', copy = '0'] = m;
  return { path, folder: folder ?? null, person: person.trim(), date, copy: Number(copy) };
}
