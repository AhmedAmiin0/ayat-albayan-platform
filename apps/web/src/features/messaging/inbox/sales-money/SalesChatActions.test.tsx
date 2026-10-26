import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { thread } from '../testing/inbox-fixture';
import { InboxModeContext } from '../shared/mode';
import { renderWithClient, routeFetch } from '../testing/test-utils';
import { SalesChatActions } from './SalesChatActions';
import { OPEN_SUB, SALES_QUOTE, student } from './sales-money-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

const FAMILY = thread({ guardian_id: 'g-1', lead_id: null, lead_status: null, guardian_name: 'أم سهيلة' });
const JUD = 'f7c1a0de-3333-4a8e-9b00-000000000003';
const TWO_ENDED = [student({ status: 'expired', open: [OPEN_SUB] }), student({ id: JUD, name: 'جود', status: 'pending_renewal' })];
const TWO_DUE = TWO_ENDED.map((s) => ({ ...s, renew_due: true }));

function renderActions(compact = false, students = TWO_ENDED) {
  routeFetch(apiFetch, [
    ['/sales/money/family', { students }],
    ['/settings', {}],
    ['/sales/money/chat-receipts', []],
  ]);
  apiSend.mockResolvedValue(SALES_QUOTE);
  renderWithClient(
    <InboxModeContext.Provider value="sales">
      <SalesChatActions thread={FAMILY} compact={compact} />
    </InboxModeContext.Provider>,
  );
}

const more = () => screen.getByRole('button', { name: t.common.more });
const renewOf = (name: string) => ({ name: `${t.students.renew} — ${name}` });

describe('SalesChatActions: one visible action, the rest in «المزيد» (W3)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('a family with none due for renewal: «اشتراك جديد» is the only visible action, secondary', async () => {
    renderActions();
    const visible = await screen.findByRole('button', { name: t.salesMoney.newSubscription });
    expect(visible.className).toContain('bg-secondary');
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual([
      t.salesMoney.newSubscription,
      t.common.more,
    ]);
    expect(screen.queryByRole('button', renewOf('جود'))).toBeNull();
  });

  it('the menu lists «تحقق من التسجيل», the transfer and the course days; no renewal hides in it', async () => {
    renderActions();
    await screen.findByRole('button', { name: t.salesMoney.newSubscription });
    fireEvent.click(more());
    expect(screen.getByRole('button', { name: t.registrationCheck.action })).toBeTruthy();
    expect(screen.queryByRole('button', { name: new RegExp(t.students.renew) })).toBeNull();
    expect(screen.getByRole('button', { name: t.salesMoney.recordTransfer })).toBeTruthy();
    expect(screen.getByRole('button', { name: `${t.booking.courseDays} — جود` })).toBeTruthy();
  });

  it('two due: «جدّد الاشتراك» is the visible action; «اشتراك جديد» from the menu stays open after it closed', async () => {
    renderActions(false, TWO_DUE);
    expect((await screen.findByRole('button', { name: t.students.renew })).className).toContain('bg-secondary');
    expect(screen.queryByRole('button', renewOf('جود'))).toBeNull();
    fireEvent.click(more());
    fireEvent.click(screen.getByRole('button', { name: t.salesMoney.newSubscription }));
    expect(more().getAttribute('aria-expanded')).toBe('false');
    const dialog = within(await screen.findByRole('dialog', { name: t.salesMoney.newSubscription }));
    expect(dialog.getByRole<HTMLSelectElement>('combobox', { name: t.salesMoney.pickChild }).value).toBe('');
  });

  it('compact (phones): the visible action is an icon button with the same name', async () => {
    renderActions(true);
    const icon = await screen.findByRole('button', { name: t.salesMoney.newSubscription });
    expect(icon.textContent).toBe('');
    expect(more()).toBeTruthy();
  });

  it('compact with one due: the icon button renews that child', async () => {
    renderActions(true, [TWO_DUE[0] ?? student(), ...TWO_ENDED.slice(1)]);
    expect((await screen.findByRole('button', renewOf('سهيلة'))).textContent).toBe('');
  });

  it('outside sales mode: nothing, and the family is never asked', () => {
    routeFetch(apiFetch, []);
    renderWithClient(
      <InboxModeContext.Provider value="admin">
        <SalesChatActions thread={FAMILY} />
      </InboxModeContext.Provider>,
    );
    expect(document.body.querySelectorAll('button')).toHaveLength(0);
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
