import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InvoiceView } from '@/features/teaching/booking/draft/contract';
import { t } from '@ab/web-kit';
import { StudentInvoices } from './StudentInvoices';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

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

afterEach(() => mockApi.reset('read'));

describe('StudentInvoices «الفواتير» (R-PAY-03)', () => {
  it('lists the student’s invoices with type and source, each openable', async () => {
    mockApi.onRead(() => [
      INVOICE,
      { ...INVOICE, id: 'e3333333-3333-4333-8333-333333333332', kind: 'package', source: 'upload' },
    ]);
    renderInvoices();
    expect(await screen.findByRole('heading', { name: t.booking.invoice.list })).toBeTruthy();
    expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/invoices?studentId=s-1' });
    expect(screen.getByText(t.booking.kind.makeup)).toBeTruthy();
    expect(screen.getByText(t.booking.invoice.sourceWhatsapp)).toBeTruthy();
    expect(screen.getByText(t.booking.invoice.sourceUpload)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: t.booking.invoice.view })).toHaveLength(2);
  });

  it('renders nothing without invoices, and nothing when the endpoint refuses (a teacher)', async () => {
    mockApi.onRead(() => []);
    renderInvoices();
    await vi.waitFor(() => expect(mockApi.reads()).not.toHaveLength(0));
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('a refused request shows nothing either', async () => {
    mockApi.onRead(() => Promise.reject(new Error('403')));
    renderInvoices();
    await vi.waitFor(() => expect(mockApi.reads()).not.toHaveLength(0));
    expect(screen.queryByRole('heading')).toBeNull();
  });
});
