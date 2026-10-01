import { tableFeatures, useTable, type ColumnDef, type RowData } from '@tanstack/react-table';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Per-column classes for both <th> and <td>, e.g. the hamish column or a 1% actions column. */
export interface DataTableColumnMeta {
  className?: string;
}

/**
 * Core-only table features: sorting/filtering/pagination are server-side (R-NFR-08), so feature
 * pages keep that state in the route search params and pass the current page as `data`.
 */
export const dataTableFeatures = tableFeatures({ columnMeta: {} as DataTableColumnMeta });
export type DataTableFeatures = typeof dataTableFeatures;
export type DataTableColumn<T extends RowData> = ColumnDef<DataTableFeatures, T>;

/** Hamish (marginal note) column: after a double gold-soft rule; folds away in narrow pages. */
export const hamishClass =
  'border-s-[3px] border-double border-s-gold-soft ps-3.5 text-xs text-ink-2 @max-[940px]:hidden';

export interface DataTableProps<T extends RowData> {
  /** Build with `col.columns([col.accessor(...), ...])` so mixed value types type-check. */
  columns: DataTableColumn<T>[];
  data: T[];
  /** Stable row key (defaults to the row index). */
  getRowId?: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyText?: string;
}

/**
 * Generic RTL table on TanStack Table (docs/07 §6 Data table): head over a 3px double gold rule,
 * hairline rows, sunk hover, no wrapping. Codes/phones in cells: wrap in <Ltr>. Ornament never
 * goes inside cells. Columns: `createColumnHelper<DataTableFeatures, T>()`.
 */
export function DataTable<T extends RowData>({
  columns,
  data,
  getRowId,
  onRowClick,
  emptyText,
}: DataTableProps<T>) {
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
  });
  const rows = table.getRowModel().rows;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className={cn(
                    'border-b-[3px] border-double border-gold px-2 py-[9px] text-start text-xs font-semibold whitespace-nowrap text-ink-3',
                    header.column.columnDef.meta?.className,
                  )}
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-2 py-6 text-center text-ink-3">
                {emptyText ?? t.common.empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={cn('transition-colors duration-[120ms] hover:bg-sunk/75', onRowClick && 'cursor-pointer')}
              >
                {row.getAllCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      'border-b border-rule px-2 py-2.5 align-middle leading-[1.4] whitespace-nowrap',
                      cell.column.columnDef.meta?.className,
                    )}
                  >
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
