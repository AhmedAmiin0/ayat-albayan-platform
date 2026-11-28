import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InvoiceView } from '@/features/teaching/booking/draft/contract';
import { t } from '@ab/web-kit';
import { StudentInvoices } from './StudentInvoices';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const INVOICE: InvoiceView = {
  id: 'e3333333-3333-4333-8333-333333333331',
  rule_id: 'e1111111-1111-4111-8111-111111111111',
  kind: 'makeup',
  mime: 'image/png',
  size_bytes: 9,
  source: 'whatsapp',
  created_at: '2026-10-03T09:00:00.000Z',
  students: [{ id: 'e2222222-2222-4222-8222-222222222222', name: 'سهيلة', code: 'AB-0183' }],
};

function renderInvoices() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <StudentInvoices studentId="s-1" />
    </QueryClientProvider>,
  );
}

afterEach(() => apiFetch.mockReset());

describe('StudentInvoices «الفواتير» (R-PAY-03)', () => {
  it('lists the student’s invoices with type and source, each openable', async () => {
    apiFetch.mockResolvedValue([INVOICE, { ...INVOICE, id: 'e3333333-3333-4333-8333-333333333332', kind: 'package', source: 'upload' }]);
    renderInvoices();
    expect(await screen.findByRole('heading', { name: t.booking.invoice.list })).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/invoices?studentId=s-1');
    expect(screen.getByText(t.booking.kind.makeup)).toBeTruthy();
    expect(screen.getByText(t.booking.invoice.sourceWhatsapp)).toBeTruthy();
    expect(screen.getByText(t.booking.invoice.sourceUpload)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: t.booking.invoice.view })).toHaveLength(2);
  });

  it('renders nothing without invoices, and nothing when the endpoint refuses (a teacher)', async () => {
    apiFetch.mockResolvedValue([]);
    renderInvoices();
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('a refused request shows nothing either', async () => {
    apiFetch.mockRejectedValue(new Error('403'));
    renderInvoices();
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(screen.queryByRole('heading')).toBeNull();
  });
});
