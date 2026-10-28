import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { WEEKLY } from '../money-fixture';
import { SubscriptionsPage } from '../SubscriptionsPage';

// The packages list: a cancelled package (owner 2026-10-28) is history only — «ملغاة», no money action.

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend: vi.fn() }));

const page = <T,>(items: T[]) => ({ items, total: items.length, page: 1, pageSize: 20 });
const FRESH = { ...WEEKLY, balance: { ...WEEKLY.balance, lessons_used: 0, remaining: WEEKLY.lessons_total } };
const CANCELLED = { ...WEEKLY, id: 'sub-x', status: 'cancelled' as const, student: { ...WEEKLY.student, name: 'ياسمين' } };

describe('subscription rows: cancel offered, cancelled shown', () => {
  it('an unpaid row offers «إلغاء الباقة»; a cancelled row shows «ملغاة» and no action at all', async () => {
    apiFetch.mockImplementation(async (path: string) => (path.startsWith('/admin-tasks') ? page([]) : page([FRESH, CANCELLED])));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SubscriptionsPage search={{}} onSearch={vi.fn()} onOpenStudent={vi.fn()} />
      </QueryClientProvider>,
    );
    const live = (await screen.findByText(WEEKLY.student.name)).closest('tr') as HTMLElement;
    expect(within(live).getByRole('button', { name: t.subscriptions.cancel.action })).toBeTruthy();
    const gone = screen.getByText('ياسمين').closest('tr') as HTMLElement;
    expect(within(gone).getByText(t.enums.subscriptionStatus.cancelled)).toBeTruthy();
    for (const name of [t.payments.record, t.subscriptions.pause, t.subscriptions.cancel.action])
      expect(within(gone).queryByRole('button', { name })).toBeNull();
  });
});
