import type { ExpenseView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FILTER_DEBOUNCE_MS } from '@/components/ColumnFilterText';
import { t } from '@/lib/i18n';
import { ExpensesPage } from './ExpensesPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const base: ExpenseView = {
  id: 'e1', month: '2026-09', category: 'ads', amount: 300, currency: 'EGP', note: 'فيسبوك', created_at: '2026-09-02T09:00:00Z',
  paid_on: '2026-09-02', vendor: 'ميتا', method: null, has_receipt: false, recurring: false, is_draft: false,
};
const ROWS = [
  base,
  { ...base, id: 'e2', category: 'rent', amount: 8000, note: 'المكتب', vendor: null },
  { ...base, id: 'e3', category: 'tools', amount: 50, note: 'زوم', is_draft: true, recurring: true },
];
const CATEGORIES = [
  { key: 'ads', label_ar: 'إعلانات', label_en: 'Ads', active: true },
  { key: 'rent', label_ar: 'إيجار', label_en: 'Rent', active: true },
];
const by = (col: string) => t.table.filterBy.replace('{col}', col);
const notes = () => screen.getAllByRole('row').slice(1).map((r) => within(r).queryByText(/فيسبوك|المكتب|زوم/)?.textContent);

function renderPage() {
  apiFetch.mockImplementation(async (path: unknown) => {
    if (path === '/expense-categories') return CATEGORIES;
    if (String(path).startsWith('/expenses/year')) {
      const months = ['2026-01', '2026-02', '2026-03'].map((month, i) => ({ month, total: [100, 900, 400][i] ?? 0, by_category: {} }));
      return { year: '2026', currency: 'SAR', months, categories: [], total: 1400, fx_missing: [], fx_date: null };
    }
    return ROWS;
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ExpensesPage month="2026-09" onMonth={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('ExpensesPage sort + filter (client: the month is loaded whole)', () => {
  beforeEach(() => (vi.useFakeTimers({ shouldAdvanceTime: true }), apiFetch.mockReset()));
  afterEach(() => vi.useRealTimers());

  it('sorts by amount and filters by state, category and note', async () => {
    renderPage();
    await screen.findByText('فيسبوك');
    fireEvent.click(screen.getByRole('button', { name: t.expenses.amount }));
    expect(notes()).toEqual(['زوم', 'فيسبوك', 'المكتب']);
    fireEvent.change(screen.getByRole('combobox', { name: by(t.finance.status) }), { target: { value: 'confirmed' } });
    expect(notes()).toEqual(['فيسبوك', 'المكتب']);
    fireEvent.change(screen.getByRole('combobox', { name: by(t.expenses.category) }), { target: { value: 'إيجار' } });
    expect(notes()).toEqual(['المكتب']);
    fireEvent.click(screen.getByRole('button', { name: t.table.clearFilters }));
    fireEvent.change(screen.getByRole('searchbox', { name: by(t.expenses.note) }), { target: { value: 'زوم' } });
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS));
    expect(notes()).toEqual(['زوم']);
  });

  it('the year table sorts by the month total', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: t.finance.yearView.replace('{year}', '2026') }));
    const total = await screen.findByRole('button', { name: t.expenses.total });
    fireEvent.click(total);
    fireEvent.click(total);
    // Descending: the dearest month first, the cheapest last.
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]?.textContent).toContain('900');
    expect(rows[2]?.textContent).toContain('100');
  });
});
