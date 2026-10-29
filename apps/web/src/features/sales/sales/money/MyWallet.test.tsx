import type { MyCommissionRow, MyEarnings, NotificationItem } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { MyWallet } from './MyWallet';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const W = t.assistantPortal.wallet;
const row = (over: Partial<MyCommissionRow> = {}): MyCommissionRow => ({
  id: 'c1', student: { code: 'AB-1022', name: 'lmkl' }, kind: 'first', share_percent: 100, amount: 50, currency: 'EGP',
  earned_at: '2026-10-29T16:42:13Z', method: 'card', state: 'due', statement_month: null, void_reason: null, ...over,
});
const EARNINGS: MyEarnings = {
  terms: null, this_month: {}, commissions_total: {}, statements: [],
  wallet: { EGP: { due: 50, paid: 40, this_month: 50 }, SAR: { due: 75, paid: 0, this_month: 0 } },
};
let bell: NotificationItem[] = [];

function open(rows: MyCommissionRow[], over: { total?: number; wallet?: MyEarnings['wallet'] } = {}) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/sales/me/commissions')) return { items: rows, total: over.total ?? rows.length, page: 1, pageSize: 20 };
    if (path.startsWith('/me/notifications')) return { items: bell, total: bell.length, page: 1, pageSize: 20, unread: 0 };
    return { ...EARNINGS, wallet: over.wallet ?? EARNINGS.wallet };
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MyWallet />
    </QueryClientProvider>,
  );
  return client;
}
const calls = (prefix: string) => apiFetch.mock.calls.filter(([p]) => String(p).startsWith(prefix)).length;

afterEach(() => {
  apiFetch.mockReset();
  bell = [];
});

describe('MyWallet «العمولات» of «محفظتي»', () => {
  it('the balance per currency: owed, this month and paid; never summed across currencies', async () => {
    open([row()]);
    const egp = (await screen.findByText(W.due, { selector: '[data-currency="EGP"] span' })).closest('[data-currency]') as HTMLElement;
    expect(egp.textContent).toContain('50');
    expect(egp.textContent).toContain('40');
    expect(document.querySelector('[data-currency="SAR"]')?.textContent).toContain('75');
    expect(screen.queryByText('125')).toBeNull();
  });

  it('an entry in two lines: «+50 ج.م» and its state, then code · student · kind · how it was paid · day', async () => {
    open([row(), row({ id: 'c2', kind: 'renewal', share_percent: 50, amount: 25, method: 'bank', state: 'in_statement', statement_month: '2026-10-01' })]);
    const list = await screen.findByRole('list', { name: W.list });
    const [due, renewal] = within(list).getAllByRole('listitem') as [HTMLElement, HTMLElement];
    expect(due.textContent).toContain('+50');
    expect(due.textContent).toContain(t.payouts.currency);
    expect(due.textContent).toContain(t.assistantPortal.commission.earned);
    expect(due.textContent).toContain(t.assistants.ledger.kind.first);
    expect(due.textContent).toContain(t.enums.paymentMethod.card);
    expect(within(due).getByText('AB-1022').closest('bdi')?.getAttribute('dir')).toBe('ltr');
    expect(renewal.textContent).toContain(t.assistants.ledger.kind.renewal.replace('{n}', '50'));
    expect(renewal.textContent).toContain(W.state.in_statement.split('{month}')[0]?.trim() ?? '');
  });

  it('a voided entry: struck through with no sign, «ملغاة», and why (the system reason, or «ألغتها الإدارة»)', async () => {
    open([row({ state: 'voided', void_reason: 'payment_voided' }), row({ id: 'c2', state: 'voided', void_reason: null })]);
    const list = await screen.findByRole('list', { name: W.list });
    const [refunded, byAdmin] = within(list).getAllByRole('listitem') as [HTMLElement, HTMLElement];
    expect(refunded.textContent).toContain(t.assistantReasons.payment_voided);
    expect(refunded.textContent).not.toContain('+50');
    expect(refunded.querySelector('.line-through')).toBeTruthy();
    expect(byAdmin.textContent).toContain(W.voidedByAdmin);
    expect(within(list).getAllByText(t.assistantPortal.commission.voided)).toHaveLength(2);
  });

  it('nothing yet: «لا رصيد مستحق الآن» and the empty list with its hint', async () => {
    open([], { wallet: {} });
    expect(await screen.findByText(W.none)).toBeTruthy();
    expect(await screen.findByText(W.empty)).toBeTruthy();
    expect(screen.getByText(W.emptyHint)).toBeTruthy();
  });

  it('more than one page: the pager asks for page 2', async () => {
    open(Array.from({ length: 20 }, (_, i) => row({ id: `c${i}` })), { total: 25 });
    await screen.findByRole('list', { name: W.list });
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/sales/me/commissions?page=2&pageSize=20'));
  });

  it('a new «عمولة جديدة» on the bell refreshes the wallet; watching the bell adds no request of its own', async () => {
    const client = open([row()]);
    await screen.findByRole('list', { name: W.list });
    await waitFor(() => expect(calls('/me/notifications')).toBe(1));
    const before = { list: calls('/sales/me/commissions'), earnings: calls('/sales/me/earnings') };
    bell = [{ id: 'n1', kind: 'commission_earned', title: '', body: '', data: {}, created_at: '2026-10-29T16:42:15Z', read_at: null }];
    await act(async () => client.refetchQueries({ queryKey: ['notifications', 'list'] }));
    await waitFor(() => expect(calls('/sales/me/commissions')).toBe(before.list + 1));
    expect(calls('/sales/me/earnings')).toBe(before.earnings + 1);
    expect(calls('/me/notifications')).toBe(2);
  });
});
