import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FILTER_DEBOUNCE_MS } from '@/components/ColumnFilterText';
import { t } from '@/lib/i18n/i18n';
import { openFilters } from '@/test/open-filters';
import { InvoicesPage } from './InvoicesPage';
import { ReceivablesPage } from './ReceivablesPage';
import { invoicesList, parseInvoicesSearch } from './search';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/reporting/dashboard/link-mock')).Link }));

const by = (col: string) => t.table.filterBy.replace('{col}', col);
const row = ({ id, name, owed, days }: { id: string; name: string; owed: number; days: number }) => ({
  id,
  student: { id: `s-${id}`, code: 'AB-0001', name },
  guardian: { name: `أم ${name}`, phone_e164: null },
  price: 500,
  currency: 'SAR',
  starts_on: '2026-07-01',
  status: 'unpaid',
  paid: 500 - owed,
  owed,
  days_overdue: days,
  bucket: days > 90 ? '90_plus' : '0_30',
});
const OWED = { rows: [row({ id: 'a', name: 'سهيلة', owed: 300, days: 96 }), row({ id: 'b', name: 'مريم', owed: 100, days: 10 }), row({ id: 'c', name: 'آمنة', owed: 450, days: 20 })], totals: [], total: 850, currency: 'SAR', fx_missing: [] };
const INVOICE = { id: 'inv-1', rule_id: 'r1', kind: 'package', mime: 'image/png', size_bytes: 10, source: 'upload', created_at: '2026-10-01T09:00:00Z', students: [], payment_id: null };

function show(node: ReactNode) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>);
}
const names = () => screen.getAllByRole('link').map((a) => a.textContent);

describe('finance tables: sort + filter (R-NFR-08)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    apiFetch.mockReset();
    apiFetch.mockImplementation(async (path: string) =>
      path === '/receivables' ? OWED : { items: [INVOICE], total: 1, page: 1, pageSize: 25 },
    );
  });
  afterEach(() => vi.useRealTimers());

  it('receivables sort by what is owed and filter by name and aging, on the loaded list', async () => {
    show(<ReceivablesPage />);
    await screen.findByRole('link', { name: 'سهيلة' });
    fireEvent.click(screen.getByRole('button', { name: t.finance.owed }));
    expect(names()).toEqual(['مريم', 'سهيلة', 'آمنة']);
    openFilters();
    fireEvent.change(screen.getByRole('combobox', { name: by(t.finance.agingBucket) }), { target: { value: '0_30' } });
    expect(names()).toEqual(['مريم', 'آمنة']);
    fireEvent.change(screen.getByRole('searchbox', { name: by(t.finance.guardian) }), { target: { value: 'امنة' } });
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS));
    expect(names()).toEqual(['آمنة']);
  });

  it('invoices: a header click and the kind filter go to the URL (page 1)', async () => {
    const onSearch = vi.fn();
    show(<InvoicesPage search={{ page: 2 }} onSearch={onSearch} />);
    fireEvent.click(await screen.findByRole('button', { name: t.finance.kind }));
    expect(onSearch).toHaveBeenLastCalledWith({ sort: 'kind', dir: undefined, page: undefined });
    openFilters();
    fireEvent.change(screen.getByRole('combobox', { name: by(t.finance.kind) }), { target: { value: 'makeup' } });
    expect(onSearch).toHaveBeenLastCalledWith({ f_kind: 'makeup', page: undefined });
  });

  it('invoices URL → the API query (allowlisted)', () => {
    const s = parseInvoicesSearch({ page: '2', sort: 'kind', dir: 'desc', f_kind: 'makeup', f_student: 'سهيلة', from: '2026-09-01' });
    expect(invoicesList(s)).toEqual({
      page: 2,
      from: '2026-09-01',
      sort: { sort: 'kind', dir: 'desc' },
      filters: { student: 'سهيلة', kind: 'makeup' },
    });
    expect(invoicesList(parseInvoicesSearch({ sort: 'amount', f_kind: 'trial', to: 'x' }))).toEqual({ page: 1, sort: {}, filters: {} });
  });
});
