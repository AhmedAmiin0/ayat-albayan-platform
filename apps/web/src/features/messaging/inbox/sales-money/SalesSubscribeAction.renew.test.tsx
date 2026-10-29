import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { detail, PHONE } from '../testing/inbox-fixture';
import { InboxModeContext } from '../shared/mode';
import { renderWithClient, routeFetch } from '../testing/test-utils';
import { ThreadPane } from '../threads/pane/ThreadPane';
import { SALES_QUOTE, student } from './sales-money-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../testing/test-utils')).MockLink }));

const FAMILY = { guardian_id: 'g-1', lead_id: null, lead_status: null, guardian_name: 'أم سهيلة' } as const;
const JUD = 'f7c1a0de-3333-4a8e-9b00-000000000003';

function open(students: ReturnType<typeof student>[]) {
  routeFetch(apiFetch, [
    ['/threads/%2B966501234567', detail([], FAMILY)],
    ['/messaging/templates', []],
    ['/leads?', { items: [], total: 0, page: 1, pageSize: 5 }],
    ['/settings', {}],
    ['/sales/money/family', { students }],
    ['/sales/money/chat-receipts', []],
  ]);
  apiSend.mockResolvedValue(SALES_QUOTE);
  renderWithClient(
    <InboxModeContext.Provider value="sales">
      <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
    </InboxModeContext.Provider>,
  );
}

const PREMIUM = { pkg: 'premium', count: 10, duration: 60, discount: 10, country: 'AE' } as const;

/** The header's «المزيد» (W3): the secondary sales actions live in it. */
const openMore = async () => fireEvent.click(await screen.findByRole('button', { name: t.common.more }));
const subscribeDialog = (name: string) => within(screen.getByRole('dialog', { name }));

describe('«جدّد الاشتراك» in a sales chat: the visible action while a student is due (owner 2026-10-26)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('one student due: «جدّد الاشتراك» is the header action, «اشتراك جديد» moves to «المزيد»', async () => {
    open([student({ status: 'active', renew_due: true })]);
    const renew = await screen.findByRole('button', { name: t.students.renew });
    expect(renew.textContent).toContain(t.students.renew);
    await openMore();
    expect(screen.getByRole('button', { name: t.salesMoney.newSubscription })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: new RegExp(t.students.renew) })).toHaveLength(1);
  });

  it('one due among several: «جدّد الاشتراك» (no name) opens on that student, prefilled from `renewal`; still editable', async () => {
    open([student({ status: 'trial' }), student({ id: JUD, name: 'جود', status: 'expired', renew_due: true, renewal: PREMIUM })]);
    const renew = await screen.findByRole('button', { name: t.students.renew });
    expect(renew.textContent).not.toContain('جود');
    fireEvent.click(renew);
    const dialog = subscribeDialog(t.students.renew);
    expect(dialog.getByRole<HTMLSelectElement>('combobox', { name: t.salesMoney.pickChild }).value).toBe(JUD);
    expect(dialog.getByLabelText(t.subscriptions.package)).toHaveProperty('value', 'premium');
    expect(dialog.getByLabelText(t.subscriptions.duration)).toHaveProperty('value', '60');
    expect(dialog.getByLabelText(t.subscriptions.country)).toHaveProperty('value', 'AE');
    expect(dialog.getByRole('button', { name: '10%', pressed: true })).toBeTruthy();
    fireEvent.change(dialog.getByLabelText(t.subscriptions.package), { target: { value: 'standard' } });
    expect(dialog.getByLabelText(t.subscriptions.package)).toHaveProperty('value', 'standard');
  });

  it('several due: one «جدّد الاشتراك» whose picker lists only the students due, each prefilled when picked', async () => {
    open([
      student({ status: 'pending_renewal', renew_due: true }),
      student({ id: JUD, name: 'جود', status: 'active', renew_due: true, renewal: PREMIUM }),
      student({ id: 'x', name: 'يوسف', status: 'active' }),
    ]);
    fireEvent.click(await screen.findByRole('button', { name: t.students.renew }));
    const dialog = subscribeDialog(t.students.renew);
    const picker = dialog.getByRole<HTMLSelectElement>('combobox', { name: t.salesMoney.pickChild });
    expect([...picker.options].map((o) => o.text)).toEqual([t.salesMoney.pickChild, expect.stringContaining('سهيلة'), expect.stringContaining('جود')]);
    fireEvent.change(picker, { target: { value: JUD } });
    expect(dialog.getByLabelText(t.subscriptions.package)).toHaveProperty('value', 'premium');
  });

  it.each(['new', 'trial', 'pending_subscription', 'active', 'paused', 'churned', 'expired'] as const)(
    '%s, not due: «اشتراك جديد» stays the action, empty calculator, no renewal',
    async (status) => {
      open([student({ status, renewal: PREMIUM })]);
      fireEvent.click(await screen.findByRole('button', { name: t.salesMoney.newSubscription }));
      expect(screen.queryByRole('button', { name: new RegExp(t.students.renew) })).toBeNull();
      expect(subscribeDialog(t.salesMoney.newSubscription).getByLabelText(t.subscriptions.package)).toHaveProperty('value', 'standard');
    },
  );
});
