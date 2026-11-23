import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PAYOUT } from '@/features/finance/subscriptions/money-fixture';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PayoutsPage } from './PayoutsPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch,
}));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
}));

const SUMMARY = { currency: 'EGP', rows: [], totals: { earned: 0, paid: 0, owed: 0, teachers_owed: 0 } };

function renderPage(failing: string) {
  let fail = true;
  apiFetch.mockImplementation(async (path: unknown) => {
    if (String(path).startsWith(failing) && fail) throw new Error('down');
    return path === '/teacher-earnings/summary' ? SUMMARY : [PAYOUT];
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PayoutsPage month="2026-09" onMonth={vi.fn()} />
    </QueryClientProvider>,
  );
  return { heal: () => (fail = false) };
}

describe('PayoutsPage load states (R-PAY-01)', () => {
  beforeEach(() => apiFetch.mockReset());

  it('a failed month read shows the error line, and retry reads it again', async () => {
    const { heal } = renderPage('/payouts');
    await screen.findByRole('alert');
    heal();
    fireEvent.click(screen.getByRole('button', { name: t.common.retry }));
    expect(await screen.findByText(t.enums.payoutStatus.draft, { selector: 'td *' })).toBeTruthy();
  });

  it('a failed dues summary offers a retry too', async () => {
    const { heal } = renderPage('/teacher-earnings/summary');
    await screen.findByRole('alert');
    heal();
    fireEvent.click(screen.getByRole('button', { name: t.common.retry }));
    expect(await screen.findByRole('region', { name: t.finance.duesTitle })).toBeTruthy();
  });
});
