import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SUMMARY } from '@/features/dashboard/dashboard-fixture';
import { t } from '@/lib/i18n';
import { yearRange } from './api';
import { FinanceSummaryPage } from './FinanceSummaryPage';
import { InvoicesPage } from './InvoicesPage';
import { ReceivablesPage } from './ReceivablesPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));

const ROW = {
  id: 'sub-1',
  student: { id: 'stu-1', code: 'AB-0183', name: 'سهيلة' },
  guardian: { name: 'أم سهيلة', phone_e164: '+966500000001' },
  price: 450,
  currency: 'SAR',
  starts_on: '2026-07-01',
  status: 'unpaid',
  paid: 150,
  owed: 300,
  days_overdue: 96,
  bucket: '90_plus',
};
const OWED = { rows: [ROW], totals: [{ currency: 'SAR', owed: 300, buckets: { '0_30': 0, '31_60': 0, '61_90': 0, '90_plus': 300 } }], total: 300, currency: 'SAR', fx_missing: [] };
const DUES = { currency: 'EGP', rows: [], totals: { earned: 0, paid: 0, owed: 0, teachers_owed: 0 } };
const INVOICE = { id: 'inv-1', rule_id: 'r1', kind: 'package', mime: 'image/png', size_bytes: 10, source: 'upload', created_at: '2026-10-01T09:00:00Z', students: [{ id: 'stu-1', name: 'سهيلة', code: 'AB-0183' }], payment_id: null };

function show(node: ReactNode) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>);
}

describe('finance pages', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/receivables') return OWED;
      if (path === '/teacher-earnings/summary') return DUES;
      if (path.startsWith('/invoices/recent')) return { items: [INVOICE, { ...INVOICE, id: 'inv-2', payment_id: 'p1' }], total: 2, page: 1, pageSize: 25 };
      if (path.startsWith('/subscriptions')) return { items: [], total: 0, page: 1, pageSize: 100 };
      return SUMMARY;
    });
  });

  it('receivables: the total, the aging line, and each student with days overdue', async () => {
    show(<ReceivablesPage />);
    expect(await screen.findByRole('link', { name: 'سهيلة' })).toBeTruthy();
    expect(screen.getByText(new RegExp(t.finance.daysLate.replace('{count}', '96')))).toBeTruthy();
    expect(screen.getAllByText(new RegExp(t.finance.aging['90_plus'])).length).toBeGreaterThan(0);
  });

  it('invoices: «سجّل كدفعة» only for an invoice without a payment; it opens the payment dialog for that student', async () => {
    show(<InvoicesPage />);
    const buttons = await screen.findAllByRole('button', { name: t.finance.recordFromInvoice });
    expect(buttons).toHaveLength(1);
    expect(screen.getByText(t.finance.invoicePaid)).toBeTruthy();
    fireEvent.click(buttons[0] as HTMLElement);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(t.finance.invoiceAsReceipt)).toBeTruthy();
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/subscriptions?studentId=stu-1&pageSize=100'));
  });

  it('summary: a year of the dashboard money (this year up to today)', async () => {
    show(<FinanceSummaryPage />);
    expect((await screen.findAllByText(t.dashboard.grossMargin)).length).toBeGreaterThan(0);
    expect(apiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/dashboard\/summary\?from=\d{4}-01-01&to=/));
    expect(yearRange('2025', '2026-10-05')).toEqual({ from: '2025-01-01', to: '2025-12-31' });
    expect(yearRange('2026', '2026-10-05')).toEqual({ from: '2026-01-01', to: '2026-10-05' });
  });
});
