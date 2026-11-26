import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { ReceivablesPage } from './ReceivablesPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch,
}));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
}));

const EMPTY = { rows: [], totals: [], total: 0, currency: 'SAR', fx_missing: [] };

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ReceivablesPage />
    </QueryClientProvider>,
  );
}

afterEach(() => apiFetch.mockReset());

describe('ReceivablesPage load states (R-PAY-01)', () => {
  it('shows a busy skeleton while loading', () => {
    apiFetch.mockReturnValue(new Promise(() => undefined));
    show();
    expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');
  });

  it('a failed read shows the error line, and retry reads again', async () => {
    apiFetch.mockRejectedValueOnce(new Error('down')).mockResolvedValue(EMPTY);
    show();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: t.common.retry }));
    expect(await screen.findByText(t.finance.noReceivables)).toBeTruthy();
  });
});
