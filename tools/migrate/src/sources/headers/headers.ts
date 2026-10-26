// Real header → field maps for every workbook tab we read (inspected 2026-10-02: sheet names and
// header rows only). Mappers read SourceRow.fields by these field names, never by column letter,
// because the same tab has different columns in different workbooks (HUB vs BOOK bookings).
import type { SourceAlias } from '../../types.ts';
import { FIN_SHEETS } from './headers.fin.ts';
import { HUB_PEOPLE } from './headers.hub.ts';
import { MONEY_SHEETS } from './headers.money.ts';
import { OPS_SHEETS } from './headers.ops.ts';

export interface SheetSpec {
  /** Cache file: cache/sheets/<id>.json. Also the name mappers use: bundle.sheets['hub_students']. */
  id: string;
  source: SourceAlias;
  /** Zip entry path, or a pattern for the 60 per-student files. */
  file: string | RegExp;
  tab: string;
  /** 1-based row holding the headers; data starts on the next row. */
  headerRow: number;
  /**
   * header text → field. A header repeated in the row is addressed as «text 2», «text 3».
   * '@A'…'@Z' address a column whose header cell is blank (FIN statements).
   */
  fields: Record<string, string>;
  /** Headers present but deliberately not imported (A9 orphan columns, send buttons). */
  ignore?: readonly string[];
}

export const SHEETS: readonly SheetSpec[] = [
  ...HUB_PEOPLE,
  ...OPS_SHEETS,
  ...MONEY_SHEETS,
  ...FIN_SHEETS,
];

/** Tabs present in the export that are not imported, with the reason (report.md lists them). */
export const SKIPPED_TABS: Record<string, string> = {
  'HUB/سجل التذكيرات': 'reminder send log of the old Apps Script; history only',
  'HUB/المواعيد المتاحة': 'generated free-slot grid; availability is re-entered per teacher',
  'HUB/لوحة الملخص': 'summary dashboard (formulas)',
  'BOOK/لوحة الملخص': 'summary dashboard (formulas)',
  'REP/Sheet1': 'empty',
  'BOOK/Sheet1': 'empty',
  'FIN/Augest cost/Income_Statement.xlsx': 'August totals only; use for validation by hand',
};

/** Files in the export that are never read (docs/06 «Not migration data»), by exact path or pattern. */
export const EXCLUDED_FILES: readonly (string | RegExp)[] = [
  'Backup  keys.docx', // recovery codes: never open
  'data.zip', // Facebook account export: never open
  'SKILL.md.docx',
  /\.json$/, // Apps Script projects (Brand, Sheet & Calendar Sync)
  // The owner's own job-search log (date/company/title/resume_version/job_url) — NOT academy
  // applicants, despite docs/06. Academy applicants: HUB «ردود التوظيف» + CRM/«كل المحادثات» توظيف.
  'job-applications-clean.xlsx',
  /^Ayat Al Bayan -- .+\.xlsx$/, // per-teacher sheets: empty
  /^Ayat ALBayan Heart\(\d\)\.xlsx$/, // older copies of HEART
  'Augest cost/Customers.XLSX', // same table as FIN «Sheet3»
];

export function isExcluded(path: string): boolean {
  return EXCLUDED_FILES.some((p) => (typeof p === 'string' ? p === path : p.test(path)));
}

/** Specs whose `file` matches a zip entry path. */
export function specsFor(path: string): SheetSpec[] {
  if (isExcluded(path)) return [];
  return SHEETS.filter((s) => (typeof s.file === 'string' ? s.file === path : s.file.test(path)));
}
