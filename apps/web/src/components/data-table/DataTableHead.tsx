import type { Header, ReactTable, RowData } from '@tanstack/react-table';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { nextSortDir } from './client-sort';
import type { DataTableFeatures, DataTableSort, SortDir } from './data-table-features';
import { Icon } from '../ui/display/icon';

const ARIA_SORT = { asc: 'ascending', desc: 'descending', none: 'none' } as const;
const HINT = { asc: t.table.sortAsc, desc: t.table.sortDesc, none: t.table.sortNone };
const ICON = { asc: 'arrow-up', desc: 'arrow-down', none: 'arrows-up-down' } as const;

type SortState = { dir: SortDir | false; toggle: () => void };

/** How a column sorts here: server (`sort` prop + `meta.sortKey`), client (TanStack), or not at all. */
function sortStateOf<T extends RowData>(header: Header<DataTableFeatures, T>, sort?: DataTableSort): SortState | null {
  const column = header.column;
  if (sort) {
    const key = column.columnDef.meta?.sortKey;
    if (!key) return null;
    const dir = sort.key === key ? (sort.dir ?? 'asc') : false;
    const toggle = () => {
      const next = nextSortDir(dir);
      sort.onChange(next === false ? {} : { key, dir: next });
    };
    return { dir, toggle };
  }
  if (!column.getCanSort()) return null;
  const dir = column.getIsSorted();
  const toggle = () => {
    const next = nextSortDir(dir);
    if (next === false) column.clearSorting();
    else column.toggleSorting(next === 'desc', false);
  };
  return { dir, toggle };
}

export interface DataTableHeadProps<T extends RowData> {
  table: ReactTable<DataTableFeatures, T>;
  sort?: DataTableSort | undefined;
}

/** The <thead>: sortable columns get `aria-sort` and a button (header text + arrow) that cycles. */
export function DataTableHead<T extends RowData>({ table, sort }: DataTableHeadProps<T>) {
  return (
    <thead>
      {table.getHeaderGroups().map((group) => (
        <tr key={group.id}>
          {group.headers.map((header) => {
            const state = header.isPlaceholder ? null : sortStateOf(header, sort);
            const now = state ? state.dir || 'none' : null;
            return (
              <th
                key={header.id}
                scope="col"
                aria-sort={now ? ARIA_SORT[now] : undefined}
                className={cn(
                  'border-b border-rule px-2 py-[9px] text-start text-xs font-semibold whitespace-nowrap text-ink-3',
                  header.column.columnDef.meta?.headClassName,
                )}
              >
                {header.isPlaceholder ? null : now && state ? (
                  <button
                    type="button"
                    onClick={state.toggle}
                    title={HINT[now]}
                    className="-mx-1 inline-flex items-center gap-1 rounded-sm px-1 hover:text-ink focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <table.FlexRender header={header} />
                    <Icon name={ICON[now]} className={cn('size-3.5', now === 'none' && 'opacity-50')} />
                  </button>
                ) : (
                  <table.FlexRender header={header} />
                )}
              </th>
            );
          })}
        </tr>
      ))}
    </thead>
  );
}
