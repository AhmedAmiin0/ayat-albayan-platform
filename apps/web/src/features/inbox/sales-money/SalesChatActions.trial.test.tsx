import type { StudentStatus } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { history } from '@/features/booking/trial-date/trial-fixture';
import { t } from '@/lib/i18n';
import { thread } from '../inbox-fixture';
import { InboxModeContext } from '../mode';
import { renderWithClient, routeFetch } from '../test-utils';
import { SalesChatActions } from './SalesChatActions';
import { student } from './sales-money-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => false }) }));

const FAMILY = thread({ guardian_id: 'g-1', lead_id: null, lead_status: null, guardian_name: 'أم سهيلة' });
const JUD = 'f7c1a0de-3333-4a8e-9b00-000000000003';
const trialOf = (name: string) => ({ name: `${t.trialDate.action} — ${name}` });

function renderFamily(statuses: [StudentStatus, StudentStatus]) {
  const students = [student({ status: statuses[0] }), student({ id: JUD, name: 'جود', status: statuses[1] })];
  routeFetch(apiFetch, [
    ['/sales/money/family', { students }],
    ['/sales/booking/trial-dates', history()],
    ['/sales/booking/teachers', []],
  ]);
  renderWithClient(
    <InboxModeContext.Provider value="sales">
      <SalesChatActions thread={FAMILY} />
    </InboxModeContext.Provider>,
  );
}

const openMenu = async () => {
  await screen.findByRole('button', { name: t.salesMoney.newSubscription });
  fireEvent.click(screen.getByRole('button', { name: t.common.more }));
};

describe('«موعد تجريبي جديد» in the sales family chat (R-ASST-01, owner 2026-10-25)', () => {
  afterEach(() => apiFetch.mockReset());

  it.each<StudentStatus>(['new', 'trial', 'pending_subscription'])('offers it for a %s child, not for a subscriber', async (status) => {
    renderFamily([status, 'active']);
    await openMenu();
    expect(screen.getByRole('button', trialOf('سهيلة'))).toBeTruthy();
    expect(screen.queryByRole('button', trialOf('جود'))).toBeNull();
  });

  it('opens the dialog for that child, with the history’s count', async () => {
    renderFamily(['trial', 'trial']);
    await openMenu();
    fireEvent.click(screen.getByRole('button', trialOf('جود')));
    expect(await screen.findByRole('dialog', { name: t.trialDate.title.replace('{name}', 'جود') })).toBeTruthy();
    expect(await screen.findByTestId('trial-date-count')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith(`/sales/booking/trial-dates?studentId=${JUD}`);
  });
});
