import { Bar } from '@ab/web-kit/components/ui/charts/Bar';
import type { BarListProps } from './BarList.types';
import { listMax, printedValue } from './bar-list.helpers';
import { RowLabel } from './RowLabel';

/**
 * Horizontal bars, one per row, with the value printed beside each, so the list reads without the
 * bars. Rows wrap their label above the bar below 640 px.
 */
export function BarList({ label, rows, max, empty }: BarListProps) {
  const full = listMax(rows, max);
  if (rows.length === 0) return <p className="text-sm text-ink-2">{empty}</p>;
  return (
    <ul aria-label={label} className="grid gap-1">
      {rows.map((row) => (
        <li
          key={row.key}
          className="grid grid-cols-1 items-center gap-x-3 gap-y-1 py-1 sm:grid-cols-[minmax(0,12rem)_1fr_auto]"
        >
          <RowLabel label={row.label} onSelect={row.onSelect} />
          <span className="flex items-center gap-3 sm:contents">
            <Bar value={row.value} max={full} />
            <span className="text-end text-sm font-semibold text-ink tabular-nums">
              {printedValue(row)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
