import { tableFeatures, useTable, type ColumnDef, type RowData } from '@tanstack/react-table';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { tableBoxClass } from './TableBox';

/** Per-column classes: `className` styles the body cells, `headClassName` the <th>. */
export interface DataTableColumnMeta {
  className?: string;
  headClassName?: string;
}

/**
 * Core-only table features: sorting/filtering/pagination are server-side (R-NFR-08), so feature
 * pages keep that state in the route search params and pass the current page as `data`.
 */
export const dataTableFeatures = tableFeatures({ columnMeta: {} as DataTableColumnMeta });
export type DataTableFeatures = typeof dataTableFeatures;
export type DataTableColumn<T extends RowData> = ColumnDef<DataTableFeatures, T>;

/** Hamish (marginal note) column: after a double gold-soft rule; folds away in narrow pages. */
const hamishHeadClass = 'border-s border-s-rule ps-3.5 @max-[940px]:hidden';
const hamishClass = `${hamishHeadClass} text-xs text-ink-2`;
/** The hamish column's `meta`: the double rule sits on the head and on the cells. */
export const hamishMeta: DataTableColumnMeta = { className: hamishClass, headClassName: hamishHeadClass };

/**
 * Under 640px rows stack (docs/07 §6 Data table): CSS only, td's become flex items; order them with
 * per-column `max-sm:order-n` meta classes. The head stays sr-only, so column names reach screen
 * readers (journey 6 counts its row on Pixel 7).
 */
const stackedClass = [
  'max-sm:[&_table]:block max-sm:[&_tbody]:block max-sm:[&_thead]:sr-only',
  'max-sm:[&_tbody_tr]:flex max-sm:[&_tbody_tr]:flex-wrap max-sm:[&_tbody_tr]:items-center',
  'max-sm:[&_tbody_tr]:gap-x-2.5 max-sm:[&_tbody_tr]:gap-y-0.5 max-sm:[&_tbody_tr]:border-b max-sm:[&_tbody_tr]:border-rule max-sm:[&_tbody_tr]:px-1 max-sm:[&_tbody_tr]:py-3',
  // Cells may wrap here, so Arabic gets its 1.5 line-height back (docs/07 §14.7); column widths
  // (w-px, w-[1%]) are for the table layout and would crush a flex item.
  'max-sm:[&_td]:w-auto max-sm:[&_td]:border-0 max-sm:[&_td]:p-0 max-sm:[&_td]:whitespace-normal max-sm:[&_td]:leading-normal',
].join(' ');

export interface DataTableProps<T extends RowData> {
  /** Build with `col.columns([col.accessor(...), ...])` so mixed value types type-check. */
  columns: DataTableColumn<T>[];
  data: T[];
  /** Stable row key (defaults to the row index). */
  getRowId?: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  /** Stacked rows under 640px instead of horizontal scroll. */
  stacked?: boolean;
  /** A list screen's main table: a fixed-height box (TableBox) that scrolls inside itself. */
  fill?: boolean;
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
  stacked,
  fill,
}: DataTableProps<T>) {
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
  });
  const rows = table.getRowModel().rows;

  return (
    // `relative` keeps absolutely positioned sr-only text inside the scroll clip (phone width).
    <div data-table-box={fill || undefined} className={cn('relative overflow-x-auto', fill && tableBoxClass, stacked && stackedClass)}>
      {/* An empty fixed-height box: the one «nothing here» row fills it, its text centred. */}
      <table className={cn('w-full border-collapse text-sm', fill && rows.length === 0 && 'h-full')}>
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className={cn(
                    'border-b border-rule px-2 py-[9px] text-start text-xs font-semibold whitespace-nowrap text-ink-3',
                    header.column.columnDef.meta?.headClassName,
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
