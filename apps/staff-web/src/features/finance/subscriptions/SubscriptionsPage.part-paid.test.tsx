import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { WEEKLY } from './money-fixture';
import { SubscriptionsPage } from './SubscriptionsPage';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

// Why is this unpaid: the status cell says how much came in and what is left.
function renderRows(rows: (typeof WEEKLY)[]) {
  mockApi.onRead(async ({ path }) => ({
    items: path.startsWith('/subscriptions') ? rows : [],
    total: rows.length,
    page: 1,
    pageSize: 20,
  }));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SubscriptionsPage search={{ page: 1 }} onSearch={vi.fn()} onOpenStudent={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('the packages list: a part-paid package', () => {
  it('80 of 81 stays «غير مدفوعة» with the part-paid line', async () => {
    renderRows([{ ...WEEKLY, price: 81, paid: 80 }]);
    expect(
      (await screen.findAllByText('مدفوعة جزئيًا: 80 من 81 ر.س · الباقي 1')).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(t.enums.subscriptionStatus.unpaid).length).toBeGreaterThan(0);
  });

  it('nothing paid: no part-paid line', async () => {
    renderRows([{ ...WEEKLY, price: 81, paid: 0 }]);
    expect((await screen.findAllByText(WEEKLY.student.name)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/مدفوعة جزئيًا/)).toBeNull();
  });
});
