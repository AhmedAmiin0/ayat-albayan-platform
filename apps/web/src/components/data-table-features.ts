import {
  columnFilteringFeature,
  createFilteredRowModel,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  type ColumnDef,
  type Row,
  type RowData,
} from '@tanstack/react-table';
import { compareValues, matchesFilter } from './client-sort';

export type SortDir = 'asc' | 'desc';
export type FilterOption = { value: string; label: string };
/** A column's filter control (ColumnFilters): a debounced search box, or a select with «الكل». */
export type ColumnFilterDef = { kind: 'text' } | { kind: 'select'; options: FilterOption[] };

/** Per-column classes: `className` styles the body cells, `headClassName` the <th>. */
export interface DataTableColumnMeta {
  className?: string;
  headClassName?: string;
  /** Server sort key (the API's `sort=` value); in `clientSort` tables any accessor column sorts. */
  sortKey?: string;
  /** A filter control above the table for this column. */
  filter?: ColumnFilterDef;
  /** Server filter key (`f_<key>` in the URL); defaults to the column id. */
  filterKey?: string;
}

/**
 * Sorting/filtering are registered for `clientSort`/`clientFilter` tables (small, fully loaded
 * lists). Paginated lists sort/filter server-side (R-NFR-08): DataTable's `sort`/`filters` props
 * only report the header/filter changes, the route search params hold them, `data` is the page.
 */
export const dataTableFeatures = tableFeatures({
  columnMeta: {} as DataTableColumnMeta,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
});
export type DataTableFeatures = typeof dataTableFeatures;
export type DataTableColumn<T extends RowData> = ColumnDef<DataTableFeatures, T>;

/** Controlled (server) sort: header clicks cycle asc → desc → none on columns with `meta.sortKey`. */
export interface DataTableSort {
  key?: string | undefined;
  /** Absent with a key = asc (the URL keeps defaults out). */
  dir?: SortDir | undefined;
  onChange: (next: { key?: string; dir?: SortDir }) => void;
}

/** Controlled (server) column filters keyed by `meta.filterKey ?? column id`; '' = no filter. */
export interface DataTableFilters {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

/** Table options for the sort/filter mode: local sorting/filtering only in client mode, one column at a time. */
export function sortFilterOptions(p: { sort?: unknown; clientSort?: boolean; filters?: unknown; clientFilter?: boolean }) {
  return {
    enableSorting: Boolean(p.clientSort) && !p.sort,
    enableColumnFilters: Boolean(p.clientFilter) && !p.filters,
    enableMultiSort: false,
    sortDescFirst: false,
  };
}

type DataRow<T extends RowData> = Row<DataTableFeatures, T>;

/** Ascending only (the table reverses for desc): Arabic collation, numbers numerically. */
export const collatorSortFn = <T extends RowData>(a: DataRow<T>, b: DataRow<T>, id: string): number =>
  compareValues(a.getValue(id), b.getValue(id));

/** Text filters match «contains» (Arabic-normalised), select filters the exact value. */
export const metaFilterFn = <T extends RowData>(row: DataRow<T>, id: string, value: unknown): boolean => {
  const kind = row.table.getColumn(id)?.columnDef.meta?.filter?.kind;
  return matchesFilter(row.getValue(id), typeof value === 'string' ? value : '', kind);
};
