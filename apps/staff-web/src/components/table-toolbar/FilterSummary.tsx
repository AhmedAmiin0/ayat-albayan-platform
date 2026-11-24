import { counted } from '@ab/core';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';

/** The count alone when the total is unknown. */
export function filterSummary(count: number, resultCount?: number): string {
  if (count === 0) return t.table.noFilters;
  const active = t.table.activeCount.replace('{n}', String(count));
  if (resultCount === undefined) return active;
  return t.table.filtersSummary.replace('{active}', active).replace('{results}', counted(t.table.resultCount, resultCount));
}

export interface FilterSummaryProps {
  /** How many filters are set (the chips). */
  count: number;
  /** The rows the filters leave, when the page knows. */
  resultCount?: number | undefined;
  /** Shown as small text (the panel's footer); else only announced to screen readers. */
  visible?: boolean;
  /**
   * The polite live region. Exactly one per toolbar: the panel's visible copy passes `false`, so a
   * change made inside the open panel is announced once (by the toolbar's own, still mounted).
   */
  live?: boolean;
}

/** Always mounted so clearing filters is announced too; screen-reader only unless `visible`. */
export function FilterSummary({ count, resultCount, visible = false, live = true }: FilterSummaryProps) {
  const liveProps = live ? ({ 'data-filter-summary': '', 'aria-live': 'polite', 'aria-atomic': true } as const) : {};
  return (
    <p {...liveProps} className={cn(visible && count > 0 ? 'text-xs text-ink-3 tabular-nums' : 'sr-only')}>
      {filterSummary(count, resultCount)}
    </p>
  );
}
