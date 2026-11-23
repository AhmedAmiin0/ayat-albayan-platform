import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { MoneyKpis } from './MoneyKpis';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch,
}));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
}));

const OWED = { rows: [], totals: [], total: 300, currency: 'SAR', fx_missing: [] };
const DUES = { currency: 'EGP', rows: [], totals: { earned: 0, paid: 0, owed: 120, teachers_owed: 1 } };

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MoneyKpis />
    </QueryClientProvider>,
  );
}

afterEach(() => apiFetch.mockReset());

describe('MoneyKpis', () => {
  it('shows busy tiles while loading, not «—»', () => {
    apiFetch.mockReturnValue(new Promise(() => undefined));
    show();
    expect(screen.queryByText('—')).toBeNull();
    expect(document.querySelectorAll('[aria-busy=true]')).toHaveLength(2);
  });

  it('shows a failed tile with a retry that reads again', async () => {
    let fail = true;
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/receivables' && fail) throw new Error('down');
      return path === '/receivables' ? OWED : DUES;
    });
    show();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(t.finance.receivablesKpi);
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: t.common.retry }));
    expect(await screen.findByRole('link', { name: /مستحق على الطلاب/ })).toBeTruthy();
  });
});
