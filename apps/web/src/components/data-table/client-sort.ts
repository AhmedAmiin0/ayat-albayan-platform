import { matchesQuery } from '@ab/shared';

// Pure compare/match for client-side tables (DataTable `clientSort` / `clientFilter`).

/** Arabic order for names (ignores case; «10» after «9»). */
const collator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });

const isEmpty = (v: unknown): v is null | undefined | '' => v === null || v === undefined || v === '';

/** Ascending compare: numbers numerically, dates by time, the rest as Arabic text; empty values last. */
export function compareValues(a: unknown, b: unknown): number {
  if (isEmpty(a) || isEmpty(b)) return Number(isEmpty(a)) - Number(isEmpty(b));
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return collator.compare(String(a), String(b));
}

export type FilterKind = 'text' | 'select';

/** Does a cell value pass a filter? text: contains, ignoring case/tashkeel/hamza forms; select: exact. */
export function matchesFilter(value: unknown, query: string, kind: FilterKind = 'text'): boolean {
  if (query === '') return true;
  const text = isEmpty(value) ? '' : String(value);
  if (kind === 'select') return text === query;
  return matchesQuery(text, query);
}

/** The header click cycle: none → asc → desc → none. */
export function nextSortDir(dir: 'asc' | 'desc' | false): 'asc' | 'desc' | false {
  if (dir === false) return 'asc';
  return dir === 'asc' ? 'desc' : false;
}
