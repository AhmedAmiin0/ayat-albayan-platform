import { useRef, useState, type ReactNode } from 'react';
import { t, cn, Button, Icon } from '@ab/web-kit';
import { ActiveFilterChips } from './ActiveFilterChips';
import { FilterPanel } from './FilterPanel';
import { FilterSummary } from './FilterSummary';
import type { FilterChip } from './types';

export interface TableToolbarProps {
  /** The one search box (page search or a column's text filter). */
  search?: ReactNode;
  /** No filter button without fields. */
  fields?: ReactNode;
  chips: FilterChip[];
  onClearAll: () => void;
  resultCount?: number | undefined;
  /** At the inline-end of the row (e.g. the page's primary action). */
  end?: ReactNode;
  /** In a narrow column the filter is an icon with its name kept for screen readers. */
  compact?: boolean;
}

function CountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <>
      <span
        aria-hidden="true"
        className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-2xs leading-none text-primary-foreground tabular-nums"
      >
        {count}
      </span>
      <span className="sr-only">{t.table.activeCount.replace('{n}', String(count))}</span>
    </>
  );
}

// Applied: mint wash, green edge and green glyph, so a filtered table reads at a glance.
const APPLIED = 'border-lapis bg-accent text-ink enabled:hover:bg-accent [&_svg]:text-lapis';

export function TableToolbar(props: TableToolbarProps) {
  const { search, fields, chips, onClearAll, resultCount, end, compact = false } = props;
  const [open, setOpen] = useState(false);
  // Focus target when a chip or clear all removes the chip row (WCAG 2.4.3).
  const filterButton = useRef<HTMLButtonElement>(null);
  // Clearing remounts the panel's search boxes, dropping a pending debounced keystroke.
  const [round, setRound] = useState(0);
  const clear = () => {
    onClearAll();
    setRound((n) => n + 1);
  };
  const count = chips.length;
  const focusFilter = () => filterButton.current?.focus();
  if (!search && !fields && !end) return null;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {search && <div className={cn('min-w-0 flex-1 sm:max-w-[340px]', compact ? 'basis-full' : 'basis-44')}>{search}</div>}
        {fields && (
          <Button
            ref={filterButton}
            type="button"
            variant="secondary"
            aria-haspopup="dialog"
            data-applied={count > 0 || undefined}
            onClick={() => setOpen(true)}
            className={cn('shrink-0', compact && 'px-2.5', count > 0 && APPLIED)}
          >
            <Icon name="sliders" />
            <span className={cn(compact && 'sr-only')}>{t.table.filter}</span>
            <CountBadge count={count} />
          </Button>
        )}
        {end && <div className="ms-auto flex gap-2.5">{end}</div>}
      </div>
      {fields && <FilterSummary count={count} resultCount={resultCount} />}
      <ActiveFilterChips chips={chips} onClearAll={clear} onEmpty={focusFilter} />
      {open && fields && (
        <FilterPanel
          onClose={() => setOpen(false)}
          onClearAll={count > 0 ? clear : undefined}
          count={count}
          resultCount={resultCount}
        >
          <div key={round} className="contents">
            {fields}
          </div>
        </FilterPanel>
      )}
    </>
  );
}
