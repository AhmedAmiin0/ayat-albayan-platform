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

const renewOf = (name: string) => ({ name: `${t.students.renew} — ${name}` });

/** The header's «المزيد» (W3): the secondary sales actions live in it. */
const openMore = async () => fireEvent.click(await screen.findByRole('button', { name: t.common.more }));

describe('«جدّد الاشتراك» in a sales chat (owner 2026-10-15)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('one per student whose package ended (pending_renewal, expired); «اشتراك جديد» stays', async () => {
    open([
      student({ status: 'pending_renewal' }),
      student({ id: JUD, name: 'جود', status: 'expired' }),
      student({ id: 'x', name: 'يوسف', status: 'active' }),
    ]);
    await openMore();
    expect(await screen.findByRole('button', renewOf('سهيلة'))).toBeTruthy();
    expect(screen.getByRole('button', renewOf('جود'))).toBeTruthy();
    expect(screen.queryByRole('button', renewOf('يوسف'))).toBeNull();
    expect(screen.getByRole('button', { name: t.salesMoney.newSubscription })).toBeTruthy();
  });

  it('several children: each button shows the child it renews (visible text = accessible name)', async () => {
    open([student({ status: 'pending_renewal' }), student({ id: JUD, name: 'جود', status: 'expired' })]);
    await openMore();
    expect((await screen.findByRole('button', renewOf('جود'))).textContent).toBe(`${t.students.renew} — جود`);
    expect(screen.getByRole('button', renewOf('سهيلة')).textContent).toBe(`${t.students.renew} — سهيلة`);
  });

  it('a single student: the plain «جدّد الاشتراك»', async () => {
    open([student({ status: 'expired' })]);
    await openMore();
    expect((await screen.findByRole('button', { name: t.students.renew })).textContent).toBe(t.students.renew);
  });

  it.each(['new', 'trial', 'pending_subscription', 'active', 'paused', 'churned'] as const)('%s: no renewal', async (status) => {
    open([student({ status })]);
    await screen.findByRole('button', { name: t.salesMoney.newSubscription });
    expect(screen.queryByRole('button', { name: new RegExp(t.students.renew) })).toBeNull();
  });

  it('opens the chat subscribe step with that student already picked', async () => {
    open([student({ status: 'trial' }), student({ id: JUD, name: 'جود', status: 'expired' })]);
    await openMore();
    fireEvent.click(await screen.findByRole('button', renewOf('جود')));
    const dialog = within(screen.getByRole('dialog', { name: t.salesMoney.newSubscription }));
    expect(dialog.getByRole<HTMLSelectElement>('combobox', { name: t.salesMoney.pickChild }).value).toBe(JUD);
  });
});
