import { t } from '@/lib/i18n';
import { ColumnFilterText } from '../ColumnFilterText';
import type { DataTableFilters } from '../data-table-features';
import { ControlField, filterByLabel } from './ControlField';
import { controlChips, splitControls } from './controls';
import { TableToolbar } from './TableToolbar';
import type { ColumnFilterControl, TableToolbarOptions } from './types';

export interface DataTableToolbarProps {
  /** Every filterable column's control (filterControls). */
  controls: ColumnFilterControl[];
  /** Server filters: their `onClear` drops several keys in one URL change. */
  filters?: DataTableFilters | undefined;
  options?: TableToolbarOptions | undefined;
}

/**
 * DataTable's toolbar: a column text filter (or the page's own box) as the search, the other
 * column filters and the page's extra fields in the «تصفية» panel, their chips under the row.
 */
export function DataTableToolbar({ controls, filters, options = {} }: DataTableToolbarProps) {
  const { search, panel } = splitControls(controls, options.search !== undefined);
  const { extra } = options;
  const chips = [...(extra?.chips ?? []), ...controlChips(panel)];
  const keys = panel.map((c) => c.key);
  const clearAll = () => {
    if (extra) extra.onClearAll(keys);
    else if (filters?.onClear) filters.onClear(keys);
    else for (const c of panel) if (c.value !== '') c.onChange('');
  };
  const box = search && (
    <ColumnFilterText
      ariaLabel={filterByLabel(search.label)}
      placeholder={t.table.searchIn.replace('{col}', search.label)}
      value={search.value}
      onChange={search.onChange}
      className="w-full"
    />
  );
  const hasFields = panel.length > 0 || extra !== undefined;
  const fields = hasFields ? (
    <>
      {extra?.fields}
      {panel.map((c) => (
        <ControlField key={c.id} control={c} />
      ))}
    </>
  ) : undefined;

  return <TableToolbar search={options.search ?? box} fields={fields} chips={chips} onClearAll={clearAll} end={options.end} />;
}
