import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import type { SalesSubscription, SubscriptionKind } from './api';
import { SalesSubscriptions } from './SalesSubscriptions';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const sub = (over: Partial<SalesSubscription>): SalesSubscription => ({
  id: 'p1',
  student: { id: 's1', code: 'AB-0183', name: 'سهيلة' },
  package: 'باقة 8 حلقات',
  status: 'unpaid',
  starts_on: '2026-10-05',
  lessons_total: 8,
  ...over,
});
const PENDING = [sub({})];
const CONFIRMED = [sub({ id: 'p2', student: { id: 's2', code: 'AB-0190', name: 'يوسف' }, status: 'active' })];

/** The route's `kind` as local state, so the tabs swap the list as they do on /sales/subscriptions. */
function Harness() {
  const [kind, setKind] = useState<SubscriptionKind>('pending');
  return <SalesSubscriptions kind={kind} onKind={setKind} />;
}

function open(rows: Record<string, SalesSubscription[]> = { pending: PENDING, confirmed: CONFIRMED }) {
  apiFetch.mockImplementation(async (path: string) => rows[path.split('kind=')[1] ?? ''] ?? []);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Harness />
    </QueryClientProvider>,
  );
}

afterEach(() => apiFetch.mockReset());

describe('SalesSubscriptions «الاشتراكات»', () => {
  it('opens on «في الانتظار» and the «مؤكدة» tab swaps the list, never mixing the two', async () => {
    open();
    expect(await screen.findByText('سهيلة')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/sales/subscriptions?kind=pending');
    expect(screen.queryByText('يوسف')).toBeNull();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((x) => [x.textContent, x.getAttribute('aria-selected')])).toEqual([['في الانتظار', 'true'], ['مؤكدة', 'false']]);
    fireEvent.click(tabs[1] as HTMLElement);
    expect(await screen.findByText('يوسف')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/sales/subscriptions?kind=confirmed');
    expect(screen.queryByText('سهيلة')).toBeNull();
  });

  it('shows student, code, package and lessons, and never a price or money', async () => {
    open();
    await screen.findByText('سهيلة');
    expect(screen.getByText('AB-0183')).toBeTruthy();
    expect(screen.getByText(/باقة 8 حلقات/)).toBeTruthy();
    expect(screen.getByText(/8 حلقة/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/SAR|EGP|ريال|جنيه|سعر|\$/);
  });

  it('says so when a segment is empty', async () => {
    open({ pending: [], confirmed: [] });
    expect(await screen.findByText(t.sales.subscriptions.emptyPending)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('tab')[1] as HTMLElement);
    expect(await screen.findByText(t.sales.subscriptions.emptyConfirmed)).toBeTruthy();
  });

  it('a failed load shows the error with a retry', async () => {
    apiFetch.mockRejectedValue(new Error('down'));
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Harness />
      </QueryClientProvider>,
    );
    expect(await screen.findByText(t.sales.retry)).toBeTruthy();
  });
});
