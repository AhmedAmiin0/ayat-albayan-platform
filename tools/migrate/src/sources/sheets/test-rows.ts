// A6: Lorem-ipsum / test rows mixed with production data. Pure.
import { normalizeArabic } from '@ab/shared';
import type { Cell } from '../../types.ts';
import { text } from './cells.ts';

// Words of the Lorem generator found in the export (names, teachers, lesson numbers, packages).
const LOREM =
  /\b(?:lorem|ipsum|dolor|amet|consectetur|adipisicing|architecto|laborum|pariatur|mollit|officiis|recusandae|veniam|occaec\w*|consequatur|placeat|nobis|maiores|facilis|omnis|ratione|rerum|nemo|test)\b/i;
// Arabic test markers, only checked in name/teacher cells («اختبار» is a real word in notes).
const AR_TEST = /(?:تجربه|اختبار|نمنم)/;

/** Placeholder numbers used while testing the forms (docs/06 step 6). */
export const DUMMY_PHONES: ReadonlySet<string> = new Set(['+966500000000', '+966501234567']);

interface TestRowInput {
  /** Name and teacher cells: Latin Lorem words or Arabic test markers. */
  names: readonly (Cell | undefined)[];
  /** Every other cell: Latin Lorem words only (links are skipped). */
  other?: readonly (Cell | undefined)[];
  phone?: string | null;
}

/** Machine reason ('lorem' | 'test_name' | 'dummy_phone') or null for a real row. */
export function testReason(o: TestRowInput): string | null {
  if (o.phone && DUMMY_PHONES.has(o.phone)) return 'dummy_phone';
  const names = o.names.map(text).filter((s): s is string => s !== null);
  if (names.some((s) => AR_TEST.test(normalizeArabic(s)))) return 'test_name';
  const other = (o.other ?? []).map(text).filter((s): s is string => s !== null);
  const latin = [...names, ...other].filter((s) => !/^https?:|^\w+\.\w+\//i.test(s));
  return latin.some((s) => LOREM.test(s)) ? 'lorem' : null;
}

/** Every cell of a row except the ones listed (e.g. long free-text notes). */
export function cellsOf(fields: Record<string, Cell>, except: readonly string[] = []): Cell[] {
  return Object.entries(fields)
    .filter(([k]) => !except.includes(k))
    .map(([, v]) => v);
}
