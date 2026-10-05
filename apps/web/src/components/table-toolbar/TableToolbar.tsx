import { useState, type ReactNode } from 'react';
import { t } from '@/lib/i18n';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { ActiveFilterChips } from './ActiveFilterChips';
import { FilterPanel } from './FilterPanel';
import type { FilterChip } from './types';

export interface TableToolbarProps {
  /** The one search box (page search or a column's text filter). */
  search?: ReactNode;
  /** The panel's fields; no «تصفية» button without them. */
  fields?: ReactNode;
  chips: FilterChip[];
  onClearAll: () => void;
  /** At the inline-end of the row (e.g. the page's primary action). */
  end?: ReactNode;
}

/** The «تصفية» button's count of set filters (the number shown, «{n} مفعّلة» for screen readers). */
function CountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <>
      <span aria-hidden="true" className="min-w-5 rounded-full bg-primary px-1.5 text-2xs leading-5 text-primary-foreground tabular-nums">
        {count}
      </span>
      <span className="sr-only">{t.table.activeCount.replace('{n}', String(count))}</span>
    </>
  );
}

/**
 * Above a table (owner, 2026-10-05: "the filters UI are too complicated"): one row with the search
 * box, «تصفية» (with the count of set filters) that opens every other filter in a panel, and an
 * optional action; under it the set filters as removable chips.
 */
export function TableToolbar({ search, fields, chips, onClearAll, end }: TableToolbarProps) {
  const [open, setOpen] = useState(false);
  // Clearing remounts the panel's search boxes, dropping a pending debounced keystroke.
  const [round, setRound] = useState(0);
  const clear = () => {
    onClearAll();
    setRound((n) => n + 1);
  };
  const count = chips.length;
  if (!search && !fields && !end) return null;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {search && <div className="min-w-0 flex-1 basis-44 sm:max-w-[340px] sm:flex-none sm:basis-[340px]">{search}</div>}
        {fields && (
          <Button type="button" variant="secondary" aria-haspopup="dialog" onClick={() => setOpen(true)} className="shrink-0">
            <Icon name="sliders" />
            {t.table.filter}
            <CountBadge count={count} />
          </Button>
        )}
        {end && <div className="ms-auto flex gap-2.5">{end}</div>}
      </div>
      <ActiveFilterChips chips={chips} onClearAll={clear} />
      {open && fields && (
        <FilterPanel onClose={() => setOpen(false)} onClearAll={count > 0 ? clear : undefined}>
          <div key={round} className="contents">
            {fields}
          </div>
        </FilterPanel>
      )}
    </>
  );
}
