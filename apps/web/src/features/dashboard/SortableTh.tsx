import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { HandSort } from './hand-sort';

const ARIA_SORT = { asc: 'ascending', desc: 'descending', none: 'none' } as const;
const HINT = { asc: t.table.sortAsc, desc: t.table.sortDesc, none: t.table.sortNone };
const ICON = { asc: 'arrow-up', desc: 'arrow-down', none: 'arrows-up-down' } as const;

export interface SortableThProps<K extends string> {
  label: string;
  sortKey: K;
  sorter: Pick<HandSort<unknown, K>, 'sort' | 'toggle'>;
  className?: string;
}

/** A column head of a hand-built table: `aria-sort` and a button (label + arrow) like DataTable's. */
export function SortableTh<K extends string>({ label, sortKey, sorter, className }: SortableThProps<K>) {
  const now = sorter.sort?.key === sortKey ? sorter.sort.dir : 'none';
  return (
    <th scope="col" aria-sort={ARIA_SORT[now]} className={cn('py-2 pe-3 font-semibold', className)}>
      <button
        type="button"
        onClick={() => sorter.toggle(sortKey)}
        title={HINT[now]}
        // -mx-1 px-1 widens the hit area without moving the text; in the last column it would stick
        // out of the table by 4px and make its scroll box scroll sideways, so it stays flush there.
        className="-mx-1 inline-flex items-center gap-1 rounded-sm px-1 hover:text-ink focus-visible:outline-2 focus-visible:outline-ring [th:last-child>&]:me-0 [th:last-child>&]:pe-0"
      >
        {label}
        <Icon name={ICON[now]} className={cn('size-3.5', now === 'none' && 'opacity-50')} />
      </button>
    </th>
  );
}
