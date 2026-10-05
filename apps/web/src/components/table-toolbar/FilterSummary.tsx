import { counted } from '@ab/shared';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** «2 مفعّلة، 14 نتيجة»; «لا توجد تصفية مفعّلة» when none is set; the count alone when the total is unknown. */
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
}

/**
 * The applied filters, announced politely whenever they change (owner, 2026-10-05: one «تصفية»
 * everywhere). Always mounted, so a change from «2 مفعّلة» to none is announced too; it stays
 * screen-reader-only unless `visible` and a filter is set.
 */
export function FilterSummary({ count, resultCount, visible = false }: FilterSummaryProps) {
  return (
    <p data-filter-summary aria-live="polite" aria-atomic="true" className={cn(visible && count > 0 ? 'text-xs text-ink-3 tabular-nums' : 'sr-only')}>
      {filterSummary(count, resultCount)}
    </p>
  );
}
