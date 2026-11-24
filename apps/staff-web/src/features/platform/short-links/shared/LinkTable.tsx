import type { ReactNode } from 'react';

interface LinkTableProps {
  id: string;
  title: string;
  count: string;
  /** The line under the title (or what an empty table says). */
  hint: string;
  head: string[];
  /** One cell per head column, per row. */
  rows: ReactNode[][];
  keys: string[];
}

const HEAD_CELL = 'border-b border-rule px-2 py-2 text-start text-xs font-semibold text-ink-2';
const BODY_CELL = 'border-b border-rule px-2 py-2.5 align-middle';

/** A titled card with a small table (the detail's users and visitors, board LinkXWebDetail). */
export function LinkTable({ id, title, count, hint, head, rows, keys }: LinkTableProps) {
  return (
    <section
      aria-labelledby={id}
      className="grid min-w-0 content-start gap-3 rounded-md border border-rule p-4"
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 id={id} className="text-base font-bold">{title}</h2>
        <span className="text-sm text-ink-3 tabular-nums">{count}</span>
      </div>
      <p className="text-xs text-ink-3">{hint}</p>
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table aria-labelledby={id} className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {head.map((h) => (
                  <th key={h} scope="col" className={HEAD_CELL}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((cells, i) => (
                <tr key={keys[i] ?? i}>
                  {cells.map((cell, j) => (
                    <td key={head[j] ?? j} className={BODY_CELL}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
