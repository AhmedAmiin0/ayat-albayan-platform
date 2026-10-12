import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { detail, PHONE } from '../inbox-fixture';
import { InboxModeContext, type InboxMode } from '../mode';
import { renderWithClient, routeFetch } from '../test-utils';
import { ThreadPane } from '../ThreadPane';
import { OPEN_SUB, student } from './sales-money-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../test-utils')).MockLink }));

const FAMILY = { guardian_id: 'g-1', lead_id: null, lead_status: null, guardian_name: 'أم سهيلة' } as const;

function open(mode: InboxMode, opts: { patch?: Parameters<typeof detail>[1]; students?: ReturnType<typeof student>[] } = {}) {
  routeFetch(apiFetch, [
    ['/threads/%2B966501234567', detail([], opts.patch ?? FAMILY)],
    ['/messaging/templates', []],
    ['/leads?', { items: [], total: 0, page: 1, pageSize: 5 }],
    ['/settings', {}],
    ['/sales/money/family', { students: opts.students ?? [student()] }],
  ]);
  renderWithClient(
    <InboxModeContext.Provider value={mode}>
      <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
    </InboxModeContext.Provider>,
  );
}

const familyCalls = () => apiFetch.mock.calls.filter(([path]) => String(path).startsWith('/sales/money/family'));

describe('«اشتراك جديد» / «سجّل تحويلًا بنكيًا» in a sales chat: who sees them (R-ASST-01/04)', () => {
  afterEach(() => apiFetch.mockReset());

  it('a family with her student: «اشتراك جديد», asked with the chat number; no transfer while nothing is owed', async () => {
    open('sales');
    expect(await screen.findByRole('button', { name: t.salesMoney.newSubscription })).toBeTruthy();
    expect(familyCalls()[0]?.[0]).toBe(`/sales/money/family?phone=${encodeURIComponent(PHONE)}`);
    expect(screen.queryByRole('button', { name: t.salesMoney.recordTransfer })).toBeNull();
    expect(screen.queryByRole('button', { name: t.inbox.registerNew })).toBeNull();
  });

  it('a package still owed adds «سجّل تحويلًا بنكيًا»', async () => {
    open('sales', { students: [student({ open: [OPEN_SUB] })] });
    expect(await screen.findByRole('button', { name: t.salesMoney.recordTransfer })).toBeTruthy();
  });

  it('a family with none of her students: no money action', async () => {
    open('sales', { students: [] });
    await screen.findByRole('heading', { level: 2 });
    await vi.waitFor(() => expect(familyCalls()).toHaveLength(1));
    expect(screen.queryByRole('button', { name: t.salesMoney.newSubscription })).toBeNull();
  });

  it('a lead keeps «تسجيل طالب جديد» only, and the family is never asked', async () => {
    open('sales', { patch: {} });
    expect(await screen.findByRole('button', { name: t.inbox.registerNew })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.salesMoney.newSubscription })).toBeNull();
    expect(familyCalls()).toHaveLength(0);
  });

  it('the admin never gets them (nor the sales family read)', async () => {
    open('admin');
    await screen.findByRole('heading', { level: 2 });
    expect(screen.queryByRole('button', { name: t.salesMoney.newSubscription })).toBeNull();
    expect(familyCalls()).toHaveLength(0);
  });
});
