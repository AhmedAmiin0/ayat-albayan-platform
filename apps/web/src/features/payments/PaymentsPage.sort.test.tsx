import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PAYMENT } from '@/features/subscriptions/money-fixture';
import { t } from '@/lib/i18n';
import { openFilters } from '@/test/open-filters';
import { PaymentsPage } from './PaymentsPage';
import { parsePaymentsSearch, paymentsView, type PaymentsUrlSearch } from './search';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const by = (col: string) => t.table.filterBy.replace('{col}', col);
const onSearch = vi.fn();

function Harness() {
  const [search, setSearch] = useState<PaymentsUrlSearch>({ page: 3 });
  return <PaymentsPage search={search} onSearch={(patch) => (onSearch(patch), setSearch((s) => ({ ...s, ...patch })))} />;
}

function renderPage(items = [PAYMENT]) {
  apiFetch.mockResolvedValue({ items, total: items.length, page: 1, pageSize: 20, totals: [] });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Harness />
    </QueryClientProvider>,
  );
}

describe('PaymentsPage sort + filters (R-NFR-08)', () => {
  beforeEach(() => (apiFetch.mockReset(), onSearch.mockReset()));

  it('a header click sorts server-side (asc, then desc) and goes back to page 1', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: t.payments.amount }));
    expect(onSearch).toHaveBeenLastCalledWith({ sort: 'amount', dir: undefined, page: undefined });
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/payments?sort=amount&page=1&pageSize=20'));
    fireEvent.click(screen.getByRole('button', { name: t.payments.amount }));
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('sort=amount&dir=desc')));
  });

  it('nothing recorded and no column filter: the empty state, no table', async () => {
    renderPage([]);
    // No filter and nothing recorded: the empty state, not a table.
    expect(await screen.findByText(t.payments.empty)).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: by(t.payments.method) })).toBeNull();
  });

  it('filters by method in the «تصفية» panel', async () => {
    renderPage();
    await screen.findByRole('button', { name: t.payments.amount });
    openFilters();
    fireEvent.change(screen.getByRole('combobox', { name: by(t.payments.method) }), { target: { value: 'cash' } });
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('method=cash')));
    expect(onSearch).toHaveBeenLastCalledWith({ f_method: 'cash', page: undefined });
    expect(screen.getByRole('combobox', { name: by(t.payments.method) })).toBeTruthy();
  });

  it('date range and kind sit in the same panel; set ones become chips, «مسح الكل» drops them in one change', async () => {
    renderPage();
    await screen.findByRole('button', { name: t.payments.amount });
    openFilters();
    fireEvent.change(screen.getByLabelText(t.finance.from), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByRole('combobox', { name: t.finance.kind }), { target: { value: 'refund' } });
    expect(onSearch).toHaveBeenLastCalledWith({ kind: 'refund', page: undefined });
    fireEvent.click(screen.getByRole('button', { name: t.table.showResults }));
    const chips = screen.getByRole('list', { name: t.table.activeFilters });
    expect(chips.textContent).toContain(`${t.finance.from}: 2026-10-01`);
    expect(chips.textContent).toContain(`${t.finance.kind}: ${t.enums.paymentKind.refund}`);
    fireEvent.click(screen.getByRole('button', { name: t.table.clearAll }));
    expect(onSearch).toHaveBeenLastCalledWith({ studentId: undefined, from: undefined, to: undefined, kind: undefined, f_method: undefined, page: undefined });
  });

  it('the URL is parsed against allowlists', () => {
    const s = parsePaymentsSearch({ sort: 'amount', dir: 'desc', f_method: 'cash', kind: 'refund', from: 'x', studentId: 'nope' });
    expect(s).toMatchObject({ sort: 'amount', dir: 'desc', f_method: 'cash', kind: 'refund', from: undefined, studentId: undefined });
    expect(parsePaymentsSearch({ sort: 'recorded_by', f_method: 'gold' })).not.toHaveProperty('sort');
    expect(parsePaymentsSearch({ f_method: 'gold' }).f_method).toBeUndefined();
    expect(paymentsView({ sort: 'paid_at', f_method: 'bank', to: '2026-10-01' })).toEqual({
      filters: { method: 'bank', to: '2026-10-01' },
      sort: { sort: 'paid_at' },
    });
  });
});
