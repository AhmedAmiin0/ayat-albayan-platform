import { counted } from '@ab/shared';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { liveSummary } from '@/test/open-filters';
import { FilterSummary, filterSummary } from './FilterSummary';

describe('filterSummary', () => {
  it('none set: says so; the count alone when the total is unknown; both when it is known', () => {
    expect(filterSummary(0)).toBe(t.table.noFilters);
    expect(filterSummary(0, 12)).toBe(t.table.noFilters);
    expect(filterSummary(2)).toBe(t.table.activeCount.replace('{n}', '2'));
    expect(filterSummary(2, 14)).toBe(
      t.table.filtersSummary.replace('{active}', t.table.activeCount.replace('{n}', '2')).replace('{results}', counted(t.table.resultCount, 14)),
    );
  });

  it('counts results in the right Arabic form (واحدة / نتيجتان / نتائج / نتيجة)', () => {
    expect(counted(t.table.resultCount, 1)).toBe(t.table.resultCount.one);
    expect(counted(t.table.resultCount, 2)).toBe(t.table.resultCount.two);
    expect(counted(t.table.resultCount, 5)).toBe(t.table.resultCount.few.replace('{n}', '5'));
    expect(counted(t.table.resultCount, 14)).toBe(t.table.resultCount.other.replace('{n}', '14'));
  });
});

describe('FilterSummary', () => {
  it('a polite live region that is screen-reader-only by default', () => {
    render(<FilterSummary count={1} resultCount={3} />);
    const live = liveSummary();
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.className).toContain('sr-only');
    expect(live.textContent).toBe(filterSummary(1, 3));
  });

  it('stays mounted when the last filter is cleared, so the change is announced', () => {
    const { rerender } = render(<FilterSummary count={2} />);
    rerender(<FilterSummary count={0} />);
    expect(liveSummary().textContent).toBe(t.table.noFilters);
  });

  it('visible (the panel footer): small text while a filter is set, hidden from sight when none is', () => {
    const { rerender } = render(<FilterSummary visible count={2} resultCount={14} />);
    expect(liveSummary().className).toContain('text-xs');
    expect(liveSummary().className).not.toContain('sr-only');
    rerender(<FilterSummary visible count={0} />);
    expect(liveSummary().className).toContain('sr-only');
  });
});
