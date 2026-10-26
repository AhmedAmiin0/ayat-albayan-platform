// extract-sheets: zip → cache/sheets/<spec id>.json (SourceRow[]) + manifest. Prints counts only.
import { basename } from 'node:path';
import { cachePath, writeJson } from '../cache.ts';
import type { SourceRow } from '../types.ts';
import { SHEETS, specsFor } from './headers/headers.ts';
import { sheetRows } from './rows.ts';
import { openZip, readWorkbook, resolveZipPath } from './zip.ts';

const REPORTS_DIR = 'تقارير آيات البيان/';

export interface SheetManifest {
  zip: string;
  sha256: string;
  extractedAt: string;
  rows: Record<string, number>;
  /** Headers found but not in the spec (A9 orphans etc.): names only, no data. */
  unknownHeaders: Record<string, string[]>;
}

interface Collected {
  rows: Map<string, SourceRow[]>;
  unknown: Record<string, string[]>;
  problems: string[];
}

/** Every workbook's tabs through their specs. Missing tabs/headers become problems (fail loud). */
async function collect(files: Record<string, Uint8Array>): Promise<Collected> {
  const out: Collected = {
    rows: new Map(SHEETS.map((s) => [s.id, []])),
    unknown: {},
    problems: [],
  };
  for (const [name, bytes] of Object.entries(files)) {
    const grids = await readWorkbook(bytes);
    for (const spec of specsFor(name)) {
      const grid = grids.find((g) => g.sheet === spec.tab);
      if (!grid) {
        out.problems.push(`${spec.id}: tab «${spec.tab}» missing in ${name}`);
        continue;
      }
      const r = sheetRows({ spec, data: grid.data, file: name });
      if (r.missing.length)
        out.problems.push(`${spec.id}: headers missing ${r.missing.join(', ')}`);
      out.unknown[spec.id] = [...new Set([...(out.unknown[spec.id] ?? []), ...r.unknown])];
      out.rows.get(spec.id)?.push(...r.rows);
    }
  }
  for (const spec of SHEETS) {
    if (typeof spec.file === 'string' && !(spec.file in files))
      out.problems.push(`${spec.id}: file not in zip`);
  }
  return out;
}

export async function extractSheets(opts: { zip?: string }): Promise<SheetManifest> {
  const zip = openZip(resolveZipPath(opts.zip));
  const got = await collect(zip.read((name) => specsFor(name).length > 0));
  if (got.problems.length) {
    throw new Error(`Export does not match sources/headers*.ts:\n${got.problems.join('\n')}`);
  }
  for (const [id, list] of got.rows) writeJson(cachePath.sheet(id), list);
  const media = zip.entries.filter(
    (e) => e.name.startsWith(REPORTS_DIR) && !/\.xlsx$/i.test(e.name) && !e.name.endsWith('/'),
  );
  writeJson(cachePath.files(), media);
  const manifest: SheetManifest = {
    zip: basename(zip.path),
    sha256: zip.sha256,
    extractedAt: new Date().toISOString(),
    rows: Object.fromEntries([...got.rows].map(([id, list]) => [id, list.length])),
    unknownHeaders: Object.fromEntries(Object.entries(got.unknown).filter(([, hs]) => hs.length)),
  };
  writeJson(cachePath.sheetManifest(), manifest);
  return manifest;
}
