import type { ChartTableProps } from './ChartTable.types';

const cellClass = 'border-b border-rule px-2 py-1.5 text-start tabular-nums';

export function ChartTable({ caption, data }: ChartTableProps) {
  return (
    <table data-chart-table className="w-full border-collapse text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          {data.columns.map((c) => (
            <th key={c} scope="col" className={`${cellClass} font-semibold text-ink-2`}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.rows.map((r) => (
          <tr key={r.key}>
            <th scope="row" className={`${cellClass} font-normal text-ink`}>
              {r.cells[0]}
            </th>
            {r.cells.slice(1).map((cell, i) => (
              <td key={`${r.key}-${String(i)}`} className={`${cellClass} text-ink`}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
