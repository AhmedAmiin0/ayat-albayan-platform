import type { PathColumn } from './columns';
import type { RowOutcome, RowStep } from './row-move';

// The JSON summary of an applied run (docs/45 §6): counts per column and in total, and the
// cursor to resume from. Never a key, never a name.

export interface ColumnTally extends Record<RowOutcome, number> {
  table: string;
  column: string;
  /** Objects this run put into MinIO. */
  copied: number;
  /** The last row id this run reached: `--table <t> --after <cursor>` resumes after it. */
  cursor: string;
}

export const COUNTS = [
  'copied',
  'rewritten',
  'skipped',
  'missing',
  'mismatch',
  'too_large',
  'changed',
  'failed',
] as const;

export type Totals = Record<(typeof COUNTS)[number], number>;

export function emptyTally(column: PathColumn, cursor: string): ColumnTally {
  const zero = Object.fromEntries(COUNTS.map((k) => [k, 0])) as Totals;
  return { ...zero, table: column.table, column: column.column, cursor };
}

export function add(tally: ColumnTally, row: { id: string; step: RowStep }): void {
  tally[row.step.outcome] += 1;
  tally.copied += row.step.copied ? 1 : 0;
  tally.cursor = row.id;
}

export function totals(tallies: readonly ColumnTally[]): Totals {
  const sum = (k: (typeof COUNTS)[number]): number => tallies.reduce((n, t) => n + t[k], 0);
  return Object.fromEntries(COUNTS.map((k) => [k, sum(k)])) as Totals;
}
