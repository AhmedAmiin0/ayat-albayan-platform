// The owner's Drive export: read entries in memory (fflate), workbooks via read-excel-file.
// Excluded files (Backup keys, data.zip …) are never decompressed: the filter runs before inflate.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync } from 'fflate';
import readXlsxFile from 'read-excel-file/node';
import { PKG_DIR } from '../cache.ts';
import { isExcluded } from './headers/headers.ts';

export interface ZipEntryInfo {
  name: string;
  size: number;
}

interface OpenZip {
  path: string;
  sha256: string;
  entries: ZipEntryInfo[];
  /** Decompresses only the entries `want` accepts (never an excluded one). */
  read(want: (name: string) => boolean): Record<string, Uint8Array>;
}

/** --zip, else MIGRATE_ZIP, else the newest repo-root tools/drive-download-*.zip. */
export function resolveZipPath(explicit: string | undefined): string {
  const given = explicit ?? process.env['MIGRATE_ZIP'];
  if (given) return given;
  const toolsDir = join(PKG_DIR, '..');
  const zips = readdirSync(toolsDir)
    .filter((f) => /^drive-download-.*\.zip$/.test(f))
    .sort();
  const newest = zips.at(-1);
  if (!newest) throw new Error('No Drive export found: pass --zip <path> or set MIGRATE_ZIP');
  return join(toolsDir, newest);
}

export function openZip(path: string): OpenZip {
  const bytes = readFileSync(path);
  const entries: ZipEntryInfo[] = [];
  unzipSync(bytes, {
    filter: (f) => {
      entries.push({ name: f.name, size: f.originalSize });
      return false;
    },
  });
  return {
    path,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    entries,
    read: (want) => unzipSync(bytes, { filter: (f) => !isExcluded(f.name) && want(f.name) }),
  };
}

interface SheetGrid {
  sheet: string;
  data: unknown[][];
}

export async function readWorkbook(bytes: Uint8Array): Promise<SheetGrid[]> {
  const sheets = await readXlsxFile(Buffer.from(bytes));
  return sheets.map((s) => ({ sheet: s.sheet, data: s.data as unknown[][] }));
}
