import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { InboxModeContext } from '@/features/messaging/inbox/shared/mode';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { SalesChatActions } from './SalesChatActions';
import { OPEN_SUB, student } from './sales-money-fixture';

// sales.renew_any (owner 2026-10-29, docs/16 row 38): the family view lists a child not hers (mine: false).
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => false }) }));

const FAMILY = thread({ guardian_id: 'g-1', lead_id: null, lead_status: null, guardian_name: 'أم سهيلة' });

describe('the sales chat actions for a child not hers', () => {
  afterEach(() => apiFetch.mockReset());

  it('«جدّد الاشتراك», «اشتراك جديد» and «سجّل تحويلًا بنكيًا» appear; no trial date for it', async () => {
    routeFetch(apiFetch, [['/sales/money/family', { students: [student({ mine: false, renew_due: true, open: [OPEN_SUB] })] }]]);
    renderWithClient(
      <InboxModeContext.Provider value="sales">
        <SalesChatActions thread={FAMILY} />
      </InboxModeContext.Provider>,
    );
    expect(await screen.findByRole('button', { name: t.students.renew })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.common.more }));
    expect(screen.getByRole('button', { name: t.salesMoney.newSubscription })).toBeTruthy();
    expect(screen.getByRole('button', { name: t.salesMoney.recordTransfer })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.trialDate.action })).toBeNull();
  });
});
