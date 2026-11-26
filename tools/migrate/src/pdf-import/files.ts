// Report PDFs in the Drive export, listed in cache/sheets/files.json as bundle.sheets[ZIP_FILES].
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

interface PdfLocation {
  folder: string | null;
  file: string;
}

const LOCATIONS: Partial<Record<number, (parts: readonly string[]) => PdfLocation>> = {
  1: ([file = '']) => ({ folder: null, file }),
  2: ([folder = '', file = '']) => ({ folder, file }),
};

function pdfLocation(path: string): PdfLocation | undefined {
  if (!isPdf(path)) return undefined;
  const parts = path.slice(ROOT.length).split('/');
  return LOCATIONS[parts.length]?.(parts);
}

function fileFields(m: RegExpExecArray): Pick<PdfName, 'person' | 'date' | 'copy'> {
  const [, person = '', date = '', copy = '0'] = m;
  return { person: person.trim(), date, copy: Number(copy) };
}

/** undefined when the path is no report PDF, sits deeper than one folder, or has no date. */
export function parsePdfName(path: string): PdfName | undefined {
  const loc = pdfLocation(path);
  const m = loc && FILE.exec(loc.file);
  if (!loc || !m) return undefined;
  return { path, folder: loc.folder, ...fileFields(m) };
}
