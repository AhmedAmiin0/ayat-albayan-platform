import { PACKAGE_IDS, quote, type Quote } from '@ab/shared';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FILTER_DEBOUNCE_MS } from '@/components/data-table/ColumnFilterText';
import { t } from '@/lib/i18n/i18n';
import { openFilters } from '@/test/open-filters';
import { PlansTable } from './PlansTable';

const PACKAGES: Quote[] = PACKAGE_IDS.map((tier) =>
  quote({ country: 'SA', duration: 45, tier, students: 1, discount: 0 }),
);
const by = (col: string) => t.table.filterBy.replace('{col}', col);
const plans = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => r.querySelector('td span')?.textContent);

describe('PlansTable (clientSort + clientFilter)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sorts by price, cheapest first, then dearest first', () => {
    render(<PlansTable packages={PACKAGES} />);
    const price = screen.getByRole('button', { name: t.pricing.packagePrice });
    fireEvent.click(price);
    const prices = [...PACKAGES].sort((a, b) => a.price - b.price).map((q) => t.pricing.packages[q.package].name);
    expect(plans()).toEqual(prices);
    fireEvent.click(price);
    expect(plans()).toEqual([...prices].reverse());
  });

  it('filters by the plan name (what the row shows) and by duration', () => {
    render(<PlansTable packages={PACKAGES} />);
    const name = t.pricing.packages.weekly.name;
    fireEvent.change(screen.getByRole('searchbox', { name: by(t.pricing.planColumn) }), { target: { value: name } });
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS));
    expect(plans()).toEqual([name]);
    fireEvent.change(screen.getByRole('searchbox', { name: by(t.pricing.planColumn) }), { target: { value: '' } });
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS));
    openFilters();
    fireEvent.change(screen.getByRole('combobox', { name: by(t.pricing.steps.duration) }), { target: { value: '90' } });
    // Only the weekly plan comes back as 90 minutes at a 45-minute catalog.
    expect(plans()).toEqual([name]);
  });
});
