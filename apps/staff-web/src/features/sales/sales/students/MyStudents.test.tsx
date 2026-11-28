import type { MyStudentRow } from '@ab/money';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { MyStudents } from './MyStudents';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

const row = (over: Partial<MyStudentRow>): MyStudentRow => ({
  id: 's1',
  code: 'AB-1000',
  name: 'سهيلة',
  brought_at: '2026-09-20T09:00:00.000Z',
  guardian_phone: null,
  first_subscription_paid: false,
  commission: null,
  renewal_commissions: 0,
  ...over,
});
const ROWS = [
  row({}),
  row({
    id: 's2',
    code: 'AB-1001',
    name: 'يوسف',
    first_subscription_paid: true,
    commission: {
      amount: 120,
      currency: 'SAR',
      status: 'earned',
      earned_at: '2026-10-02T09:00:00.000Z',
    },
  }),
  row({
    id: 's3',
    code: 'AB-1002',
    name: 'جود',
    first_subscription_paid: false,
    commission: {
      amount: 50,
      currency: 'USD',
      status: 'voided',
      earned_at: '2026-10-01T09:00:00.000Z',
    },
  }),
];

function open(rows: MyStudentRow[]) {
  mockApi.onRead(() => rows);
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MyStudents />
    </QueryClientProvider>,
  );
}

afterEach(() => mockApi.reset('read'));

describe('MyStudents «طلابي»', () => {
  it('lists the students I brought with code, date, first-subscription state and my commission', async () => {
    open(ROWS);
    expect(await screen.findByText('سهيلة')).toBeTruthy();
    expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/sales/me/students' });
    expect(screen.getByRole('table', { name: t.assistantPortal.students.title })).toBeTruthy();
    expect(screen.getByText('AB-1001')).toBeTruthy();
    expect(screen.getAllByText(t.assistantPortal.students.unpaid)).toHaveLength(2);
    expect(screen.getAllByText(t.assistantPortal.students.paid)).toHaveLength(1);
  });

  it('shows each commission in its own currency with its status, and no dash-less amount for a student without one', async () => {
    open(ROWS);
    await screen.findByText('يوسف');
    expect(screen.getByText('120')).toBeTruthy();
    expect(screen.getByText('50')).toBeTruthy();
    expect(screen.getByText(t.pricing.currencies.SAR)).toBeTruthy();
    expect(screen.getByText(t.pricing.currencies.USD)).toBeTruthy();
    expect(screen.getByText(t.assistantPortal.commission.earned)).toBeTruthy();
    expect(screen.getByText(t.assistantPortal.commission.voided)).toBeTruthy();
    expect(screen.getAllByText('—')).toHaveLength(1);
  });

  it('never shows a price, a package or a payment', async () => {
    open(ROWS);
    await screen.findByText('سهيلة');
    expect(document.body.textContent).not.toMatch(/سعر|باقة|price|package/);
  });

  it('says so, and how the list fills, when I brought nobody yet', async () => {
    open([]);
    expect(await screen.findByText(t.assistantPortal.students.empty)).toBeTruthy();
    expect(screen.getByText(t.assistantPortal.students.emptyHint)).toBeTruthy();
  });

  it('a failed load shows the error with a retry that asks again', async () => {
    mockApi.onRead(() => Promise.reject(new Error('down')));
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MyStudents />
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByRole('button', { name: t.sales.retry }));
    expect(mockApi.reads()).toHaveLength(2);
  });
});
