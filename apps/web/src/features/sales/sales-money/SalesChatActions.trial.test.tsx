import type { StudentStatus } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { history } from '@/features/teaching/booking/trial-date/trial-fixture';
import { t } from '@/lib/i18n/i18n';
import { thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { InboxModeContext } from '@/features/messaging/inbox/shared/mode';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { SalesChatActions } from './SalesChatActions';
import { student } from './sales-money-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => false }) }));

const FAMILY = thread({ guardian_id: 'g-1', lead_id: null, lead_status: null, guardian_name: 'أم سهيلة' });
const JUD = 'f7c1a0de-3333-4a8e-9b00-000000000003';
const TRIAL = { name: t.trialDate.action };
const trialFor = (name: string) => ({ name: t.trialDate.title.replace('{name}', name) });

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

  it.each<StudentStatus>(['new', 'trial', 'pending_subscription'])('ONE entry, no name: a %s child beside a subscriber opens straight away', async (status) => {
    renderFamily([status, 'active']);
    await openMenu();
    expect(screen.getAllByRole('button', TRIAL)).toHaveLength(1);
    expect(screen.queryByRole('button', { name: / — / })).toBeNull();
    fireEvent.click(screen.getByRole('button', TRIAL));
    expect(await screen.findByRole('dialog', trialFor('سهيلة'))).toBeTruthy();
  });

  it('several children: «لأيّ طالب؟» first, then the dialog for the one picked, with the history’s count', async () => {
    renderFamily(['trial', 'trial']);
    await openMenu();
    fireEvent.click(screen.getByRole('button', TRIAL));
    const choice = within(await screen.findByRole('dialog', TRIAL));
    fireEvent.click(choice.getByRole('button', { name: /جود/ }));
    expect(await screen.findByRole('dialog', trialFor('جود'))).toBeTruthy();
    expect(await screen.findByTestId('trial-date-count')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith(`/sales/booking/trial-dates?studentId=${JUD}`);
  });
});
