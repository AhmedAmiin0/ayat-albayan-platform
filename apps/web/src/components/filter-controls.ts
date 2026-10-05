import type { Header, ReactTable, RowData } from '@tanstack/react-table';
import type { ColumnFilterControl } from './ColumnFilters';
import type { DataTableFeatures, DataTableFilters } from './data-table-features';

/** A header's plain text (`header: () => t.x` or a string), for filter labels; else the column id. */
export function headerText<T extends RowData>(header: Header<DataTableFeatures, T>): string {
  const def = header.column.columnDef.header;
  const text: unknown = typeof def === 'function' ? def(header.getContext()) : def;
  return typeof text === 'string' ? text : header.column.id;
}

export interface FilterControlsOptions {
  /** Server filters (controlled); wins over `clientFilter`. */
  filters?: DataTableFilters | undefined;
  clientFilter?: boolean | undefined;
}

/** The filter controls of every column with `meta.filter`, wired to the server or the table. */
export function filterControls<T extends RowData>(
  table: ReactTable<DataTableFeatures, T>,
  { filters, clientFilter }: FilterControlsOptions,
): ColumnFilterControl[] {
  if (!filters && !clientFilter) return [];
  return table.getFlatHeaders().flatMap((header) => {
    const { column } = header;
    const filter = column.columnDef.meta?.filter;
    if (!filter || header.isPlaceholder) return [];
    const label = headerText(header);
    if (filters) {
      const key = column.columnDef.meta?.filterKey ?? column.id;
      const onChange = (value: string) => filters.onChange(key, value);
      return [{ id: column.id, label, filter, value: filters.values[key] ?? '', onChange }];
    }
    const current = column.getFilterValue();
    const onChange = (value: string) => column.setFilterValue(value === '' ? undefined : value);
    return [{ id: column.id, label, filter, value: typeof current === 'string' ? current : '', onChange }];
  });
}
