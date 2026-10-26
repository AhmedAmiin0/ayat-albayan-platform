// Git-ignored working dirs (personal data): cache/ = extracted sources, out/ = plans and reports.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PKG_DIR = fileURLToPath(new URL('..', import.meta.url));
const CACHE_DIR = fileURLToPath(new URL('../cache/', import.meta.url));
const OUT_DIR = fileURLToPath(new URL('../out/', import.meta.url));

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 1)}\n`);
}

/** Parsed JSON, or `fallback` when the file does not exist yet. */
export function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw err;
  }
}

export function writeText(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

export const cachePath = {
  sheet: (id: string) => `${CACHE_DIR}sheets/${id}.json`,
  sheetManifest: () => `${CACHE_DIR}sheets/manifest.json`,
  /** Zip entries under «تقارير آيات البيان/» that are not workbooks: PDFs, images, docx. */
  files: () => `${CACHE_DIR}sheets/files.json`,
  crm: (table: string) => `${CACHE_DIR}crm/${table}.json`,
  crmCursor: () => `${CACHE_DIR}crm/cursor.json`,
  /** Teacher directory: Arabic names + spelling aliases (personal, git-ignored; teachers.dir.ts). */
  teachers: () => `${CACHE_DIR}teachers.json`,
  /** Owner decisions: zip paths of weakly matched PDFs to attach anyway (RUNBOOK.md). */
  pdfApproved: () => `${CACHE_DIR}pdf-approved.json`,
};

export const outPath = {
  plan: () => `${OUT_DIR}plan.json`,
  report: () => `${OUT_DIR}report.md`,
  review: () => `${OUT_DIR}review.xlsx`,
  validate: () => `${OUT_DIR}validate.md`,
};
