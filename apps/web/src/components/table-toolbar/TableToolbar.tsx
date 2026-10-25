import { useRef, useState, type ReactNode } from 'react';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '../ui/form/button';
import { Icon } from '../ui/display/icon';
import { ActiveFilterChips } from './ActiveFilterChips';
import { FilterPanel } from './FilterPanel';
import { FilterSummary } from './FilterSummary';
import type { FilterChip } from './types';

export interface TableToolbarProps {
  /** The one search box (page search or a column's text filter). */
  search?: ReactNode;
  /** The panel's fields; no «تصفية» button without them. */
  fields?: ReactNode;
  chips: FilterChip[];
  onClearAll: () => void;
  /** The rows the filters leave, when the page knows: «عرض النتائج (14)» and the screen-reader summary. */
  resultCount?: number | undefined;
  /** At the inline-end of the row (e.g. the page's primary action). */
  end?: ReactNode;
  /**
   * A narrow column (the inbox list, 300–400px): a smaller search basis and «تصفية» as an icon (its
   * name kept for screen readers), so search, filter and `end` share one row.
   */
  compact?: boolean;
}

/** The «تصفية» button's count of set filters (the number shown, «{n} مفعّلة» for screen readers). */
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

// Applied: the button takes the mint wash, a green edge and a green glyph, so a filtered table reads at a glance.
const APPLIED = 'border-lapis bg-accent text-ink enabled:hover:bg-accent [&_svg]:text-lapis';

/**
 * Above a table (owner, 2026-10-05: "the filters UI are too complicated"): one row with the search
 * box, «تصفية» (tinted, with the count of set filters) that opens every other filter in a panel, and
 * an optional action; under it the set filters as removable chips. The applied filters are announced
 * to screen readers as they change.
 */
export function TableToolbar({ search, fields, chips, onClearAll, resultCount, end, compact = false }: TableToolbarProps) {
  const [open, setOpen] = useState(false);
  // Where focus lands when a chip or «مسح الكل» takes the chip row away (WCAG 2.4.3).
  const filterButton = useRef<HTMLButtonElement>(null);
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
        {/* Grows to 340px at most and shrinks to share the row with «تصفية» in a narrow column (the inbox list). */}
        {search && <div className={cn('min-w-0 flex-1 sm:max-w-[340px]', compact ? 'basis-24' : 'basis-44')}>{search}</div>}
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
      <ActiveFilterChips chips={chips} onClearAll={clear} onEmpty={() => filterButton.current?.focus()} />
      {open && fields && (
        <FilterPanel onClose={() => setOpen(false)} onClearAll={count > 0 ? clear : undefined} count={count} resultCount={resultCount}>
          <div key={round} className="contents">
            {fields}
          </div>
        </FilterPanel>
      )}
    </>
  );
}
