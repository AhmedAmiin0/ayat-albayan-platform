import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { ReceivablesPage } from './ReceivablesPage';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  call: (request: unknown) => mockApi.call(request),
}));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
}));

// A stopped course owes its stored decision (owedFor), never the package's price.
const STOPPED = {
  id: 'a',
  student: { id: 's-a', code: 'AB-0001', name: 'سهيلة' },
  guardian: null,
  price: 400,
  currency: 'SAR',
  starts_on: '2026-07-01',
  status: 'cancelled',
  cancel_kind: 'stopped',
  stop_owed_amount: 150,
  paid: 100,
  owed: 50,
  days_overdue: 10,
  bucket: '0_30',
};

describe('receivables: a stopped course', () => {
  it('«دُفع 100 من 150»: of what it is owed for', async () => {
    mockApi.onRead(() => ({
      rows: [STOPPED],
      totals: [],
      total: 50,
      currency: 'SAR',
      fx_missing: [],
    }));
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ReceivablesPage />
      </QueryClientProvider>,
    );
    const line = t.payments.paidOf.replace('{paid}', '100').replace('{price}', '150');
    expect(await screen.findByText(line)).toBeTruthy();
    expect(
      screen.queryByText(t.payments.paidOf.replace('{paid}', '100').replace('{price}', '400')),
    ).toBeNull();
  });
});
