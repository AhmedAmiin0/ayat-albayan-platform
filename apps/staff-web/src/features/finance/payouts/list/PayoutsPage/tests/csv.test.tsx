import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { PAYOUT } from '@/features/finance/subscriptions/money-fixture';
import { t } from '@ab/web-kit';
import { PayoutsPage } from '@/features/finance/payouts/list/PayoutsPage/PayoutsPage';

const apiFetch = vi.hoisted(() => vi.fn());
const downloadCsv = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch,
}));
vi.mock('@/features/reporting/exports/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  downloadCsv,
}));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
}));

it("the month's CSV comes from the payouts export route", async () => {
  apiFetch.mockResolvedValue([PAYOUT]);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PayoutsPage month="2026-09" onMonth={vi.fn()} />
    </QueryClientProvider>,
  );
  const button = await screen.findByRole('button', { name: t.payouts.exportCsv });
  await waitFor(() => {
    expect(button).toHaveProperty('disabled', false);
  });
  fireEvent.click(button);
  await waitFor(() => {
    expect(downloadCsv).toHaveBeenCalledWith({ kind: 'payouts', params: { month: '2026-09' } });
  });
  expect(apiFetch).not.toHaveBeenCalledWith(expect.stringContaining('/exports/'));
});
