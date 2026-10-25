import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ABRAR } from '@/features/booking/wizard-fixture';
import { t } from '@/lib/i18n/i18n';
import { thread } from '../inbox-fixture';
import { InboxModeContext } from '../mode';
import { renderWithClient, routeFetch } from '../test-utils';
import { SalesChatFrame } from './SalesChatFrame';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../test-utils')).MockLink }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

const FAMILY = { students: [{ id: 's1', code: 'AB-0001', name: 'سهيلة', status: 'trial', open: [] }] };

/** The chat as the poll sees it: a lead, then (after the booking) the family it became. */
function Pane() {
  const [th, setTh] = useState(thread());
  const convert = () => setTh(thread({ guardian_id: 'g1', guardian_name: 'أم سهيلة', lead_status: 'converted' }));
  return (
    <SalesChatFrame thread={th} compact={false}>
      {(actions: ReactNode) => (
        <header>
          {actions}
          <button type="button" onClick={convert}>
            poll
          </button>
        </header>
      )}
    </SalesChatFrame>
  );
}

afterEach(() => apiFetch.mockReset());

describe('SalesChatFrame: the lead becoming a family under an open «تسجيل طالب جديد» (journey 7 step 3)', () => {
  it('keeps the same dialog and wizard when the polled thread turns into a family of hers', async () => {
    routeFetch(apiFetch, [
      ['/settings', {}],
      ['/sales/booking/teachers', [ABRAR]],
      ['/sales/money/family', FAMILY],
    ]);
    renderWithClient(
      <InboxModeContext.Provider value="sales">
        <Pane />
      </InboxModeContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: t.inbox.registerNew }));
    const register = screen.getByRole('dialog', { name: t.inbox.registerNew });
    const name = within(register).getByRole<HTMLInputElement>('textbox', { name: (n) => n.startsWith(t.guardians.name) });
    fireEvent.change(name, { target: { value: 'أم جود' } });

    fireEvent.click(screen.getByRole('button', { name: 'poll' }));
    // Her family's actions arrive («اشتراك جديد»): the header switched to the family branch.
    await screen.findByRole('button', { name: t.salesMoney.newSubscription });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/sales\/money\/family/)));
    expect(screen.getByRole('dialog', { name: t.inbox.registerNew })).toBe(register);
    expect(name.isConnected).toBe(true);
    expect(name.value).toBe('أم جود');
  });
});
