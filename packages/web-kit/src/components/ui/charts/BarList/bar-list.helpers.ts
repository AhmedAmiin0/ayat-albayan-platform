import type { BarListRow } from './BarList.types';

export function listMax(rows: readonly BarListRow[], max: number | undefined): number {
  return max ?? Math.max(0, ...rows.map((r) => r.value));
}

export function printedValue(row: BarListRow): string {
  return row.valueLabel ?? String(row.value);
}
