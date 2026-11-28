import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { MoneyKpis } from './MoneyKpis';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  call: (request: unknown) => mockApi.call(request),
}));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
}));

const OWED = { rows: [], totals: [], total: 300, currency: 'SAR', fx_missing: [] };
const DUES = {
  currency: 'EGP',
  rows: [],
  totals: { earned: 0, paid: 0, owed: 120, teachers_owed: 1 },
};

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MoneyKpis />
    </QueryClientProvider>,
  );
}

afterEach(() => mockApi.reset('read'));

describe('MoneyKpis', () => {
  it('shows busy tiles while loading, not «—»', () => {
    mockApi.onRead(() => new Promise(() => undefined));
    show();
    expect(screen.queryByText('—')).toBeNull();
    expect(document.querySelectorAll('[aria-busy=true]')).toHaveLength(2);
  });

  it('shows a failed tile with a retry that reads again', async () => {
    let fail = true;
    mockApi.onRead(async ({ path }) => {
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
