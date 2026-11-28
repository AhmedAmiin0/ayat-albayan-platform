import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { openFilters } from '@/test/open-filters';
import type { SalesSubscriptionView } from '@ab/shared';
import type { SubscriptionStatus } from '@ab/catalog';
import { SalesSubscriptions } from './subscriptions/SalesSubscriptions';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

const sub = (id: string, name: string, status: SubscriptionStatus): SalesSubscriptionView => ({
  id,
  student: { id, code: `AB-0${id}`, name },
  package: '8',
  status,
  starts_on: '2026-10-05',
  lessons_total: 8,
});

const firstCells = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => r.querySelector('td')?.textContent ?? '');
const filterBy = (col: string) => t.table.filterBy.replace('{col}', col);
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

afterEach(() => mockApi.reset('read'));

describe('sales lists sort and filter locally (R-NFR-08)', () => {
  it('subscriptions: the student header sorts by name; the status select filters', async () => {
    mockApi.onRead(() => [
      sub('101', 'يوسف', 'active'),
      sub('102', 'أحمد', 'unpaid'),
      sub('103', 'سهيلة', 'unpaid'),
    ]);
    render(
      <QueryClientProvider client={client()}>
        <SalesSubscriptions kind="pending" onKind={vi.fn()} />
      </QueryClientProvider>,
    );
    await screen.findByText('يوسف');
    fireEvent.click(screen.getByRole('button', { name: t.sales.subscriptions.student }));
    expect(firstCells().map((c) => c.replace(/AB-\d+/, ''))).toEqual(['أحمد', 'سهيلة', 'يوسف']);
    openFilters();
    fireEvent.change(screen.getByLabelText(filterBy(t.sales.subscriptions.status)), {
      target: { value: 'unpaid' },
    });
    expect(firstCells()).toHaveLength(2);
    expect(screen.queryByText('يوسف')).toBeNull();
  });

  it('subscriptions: the student search finds a code', async () => {
    mockApi.onRead(() => [sub('101', 'يوسف', 'active'), sub('102', 'أحمد', 'unpaid')]);
    render(
      <QueryClientProvider client={client()}>
        <SalesSubscriptions kind="pending" onKind={vi.fn()} />
      </QueryClientProvider>,
    );
    await screen.findByText('يوسف');
    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText(filterBy(t.sales.subscriptions.student)), {
      target: { value: '0102' },
    });
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    expect(screen.queryByText('يوسف')).toBeNull();
    expect(screen.getByText('أحمد')).toBeTruthy();
  });
});
