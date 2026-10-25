import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { thread } from '../inbox-fixture';
import { InboxModeContext } from '../mode';
import { routeFetch } from '../test-utils';
import { SalesChatFrame } from './SalesChatFrame';
import { OPEN_SUB, SALES_QUOTE, student } from './sales-money-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

const FAMILY = thread({ guardian_id: 'g-1', lead_id: null, lead_status: null, guardian_name: 'أم سهيلة' });
const JUD = 'f7c1a0de-3333-4a8e-9b00-000000000003';
const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

/** The phone header and the wide header put the buttons in different trees, like ThreadPane. */
const pane = (compact: boolean) => (
  <QueryClientProvider client={client}>
    <InboxModeContext.Provider value="sales">
      <SalesChatFrame thread={FAMILY} compact={compact}>
        {(actions: ReactNode) => (compact ? <header>{actions}</header> : <section><div>{actions}</div></section>)}
      </SalesChatFrame>
    </InboxModeContext.Provider>
  </QueryClientProvider>
);

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  client.clear();
});

describe('SalesChatFrame: crossing 900px keeps an open sales dialog (m13)', () => {
  it('a renewal dialog with a changed child stays open, the same node, after the width flips', async () => {
    routeFetch(apiFetch, [
      ['/sales/money/family', { students: [student({ status: 'expired', open: [OPEN_SUB] }), student({ id: JUD, name: 'جود', status: 'pending_renewal' })] }],
      ['/settings', {}],
      ['/sales/money/chat-receipts', []],
    ]);
    apiSend.mockResolvedValue(SALES_QUOTE);
    const view = render(pane(false));
    await screen.findByRole('button', { name: t.salesMoney.newSubscription });
    fireEvent.click(screen.getByRole('button', { name: t.common.more }));
    fireEvent.click(screen.getByRole('button', { name: `${t.students.renew} — جود` }));
    const dialog = await screen.findByRole('dialog', { name: t.salesMoney.newSubscription });
    const child = within(dialog).getByRole<HTMLSelectElement>('combobox', { name: t.salesMoney.pickChild });
    const other = [...child.options].find((o) => o.value && o.value !== JUD)?.value ?? '';
    fireEvent.change(child, { target: { value: other } });

    view.rerender(pane(true));
    expect(screen.getByRole('dialog', { name: t.salesMoney.newSubscription })).toBe(dialog);
    expect(within(dialog).getByRole<HTMLSelectElement>('combobox', { name: t.salesMoney.pickChild }).value).toBe(other);
    // The phone header got the icon button.
    expect(screen.getByRole('button', { name: t.salesMoney.newSubscription }).textContent).toBe('');
  });

  it('outside sales mode: no sales buttons, «المزيد» holds «القوائم» only (docs/22), the pane still renders', () => {
    routeFetch(apiFetch, []);
    render(
      <QueryClientProvider client={client}>
        <InboxModeContext.Provider value="admin">
          <SalesChatFrame thread={FAMILY} compact={false}>
            {(actions: ReactNode) => <p>الرسائل{actions}</p>}
          </SalesChatFrame>
        </InboxModeContext.Provider>
      </QueryClientProvider>,
    );
    expect(screen.getByText('الرسائل')).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.salesMoney.newSubscription })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.common.more }));
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['', t.inbox.lists.title]);
  });
});
