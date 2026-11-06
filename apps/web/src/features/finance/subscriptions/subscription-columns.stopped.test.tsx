import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { WEEKLY } from './money-fixture';
import { SubscriptionsPage } from './SubscriptionsPage';

// «إلغاء الاشتراك» keeps the money (migration 991): a stopped package still owes, so its row
// takes a payment or a refund and shows what is paid; never a pause. An unused cancel is history
// only.

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));
vi.mock('@/features/people/auth', async (orig) => ({
  ...(await orig<object>()),
  usePermissions: () => ({ permissions: ['courses.pause'], can: () => true }),
}));

const page = <T,>(items: T[]) => ({ items, total: items.length, page: 1, pageSize: 20 });
const student = (id: string, name: string) => ({ ...WEEKLY.student, id, name });
const STOPPED = {
  ...WEEKLY,
  id: 'sub-stop',
  status: 'cancelled' as const,
  cancel_kind: 'stopped',
  paid: 50,
  student: student('stu-s', 'ياسمين'),
};
const UNUSED = { ...STOPPED, id: 'sub-unused', cancel_kind: 'unused', student: student('stu-u', 'مريم') };
// Owner 2026-11-06: a refund stop stored owed = the net paid left, so nothing more is due.
const SETTLED = { ...STOPPED, id: 'sub-settled', stop_owed_amount: 50, student: student('stu-r', 'هدى') };

async function rowOf(name: string) {
  apiFetch.mockImplementation(async (path: string) =>
    path.startsWith('/subscriptions') ? page([STOPPED, UNUSED, SETTLED]) : page([]),
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SubscriptionsPage search={{}} onSearch={vi.fn()} onOpenStudent={vi.fn()} />
    </QueryClientProvider>,
  );
  return within((await screen.findByText(name)).closest('tr') as HTMLElement);
}

describe('subscription rows: a stopped package keeps its money', () => {
  it('a stopped package that owes: a payment and a refund, no pause, no cancel', async () => {
    const row = await rowOf('ياسمين');
    expect(row.getByRole('button', { name: t.payments.record })).toBeTruthy();
    expect(row.getByRole('button', { name: t.finance.refund })).toBeTruthy();
    expect(row.queryByRole('button', { name: t.coursePause.action })).toBeNull();
    expect(row.queryByRole('button', { name: t.subscriptions.cancel.action })).toBeNull();
  });

  it('a stopped package that owes nothing more (owedFor): no «سجّل دفعة», the refund stays', async () => {
    const row = await rowOf('هدى');
    expect(row.queryByRole('button', { name: t.payments.record })).toBeNull();
    expect(row.getByRole('button', { name: t.finance.refund })).toBeTruthy();
  });

  it('an unused cancel: no payment, refund or pause', async () => {
    const row = await rowOf('مريم');
    for (const name of [t.payments.record, t.finance.refund, t.coursePause.action])
      expect(row.queryByRole('button', { name })).toBeNull();
  });
});
