import { tableFeatures, useTable, type ColumnDef, type RowData } from '@tanstack/react-table';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Core-only table features: sorting/filtering/pagination are server-side (R-NFR-08), so feature
 * pages keep that state in the route search params and pass the current page as `data`.
 */
export const dataTableFeatures = tableFeatures({});
export type DataTableFeatures = typeof dataTableFeatures;
export type DataTableColumn<T extends RowData> = ColumnDef<DataTableFeatures, T>;

export interface DataTableProps<T extends RowData> {
  /** Build with `col.columns([col.accessor(...), ...])` so mixed value types type-check. */
  columns: DataTableColumn<T>[];
  data: T[];
  /** Stable row key (defaults to the row index). */
  getRowId?: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyText?: string;
}

/** Generic RTL table on TanStack Table. Columns: `createColumnHelper<DataTableFeatures, T>()`. */
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
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id} className="px-3 py-2 text-start font-medium">
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-muted-foreground">
                {emptyText ?? t.common.empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={cn(
                  'border-t border-border',
                  onRowClick && 'cursor-pointer hover:bg-muted/40',
                )}
              >
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
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
