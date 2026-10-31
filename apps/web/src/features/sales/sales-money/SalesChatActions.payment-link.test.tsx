import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { detail, PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { InboxModeContext } from '@/features/messaging/inbox/shared/mode';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { ThreadPane } from '@/features/messaging/inbox/threads/pane/ThreadPane';
import { answer } from './payment-link/link.fixture';
import { student } from './sales-money-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

const FAMILY = { guardian_id: 'g-1', lead_id: null, lead_status: null, guardian_name: 'أم سهيلة' } as const;

function open(stripe: boolean) {
  routeFetch(apiFetch, [
    ['/threads/%2B966501234567', detail([], FAMILY)],
    ['/messaging/templates', []],
    ['/leads?', { items: [], total: 0, page: 1, pageSize: 5 }],
    ['/settings', {}],
    ['/sales/money/family', { students: [student({ status: 'active' })] }],
    ['/sales/subscriptions/teachers', []],
    ['/stripe/feature', { stripe }],
  ]);
  answer(apiSend);
  renderWithClient(
    <InboxModeContext.Provider value="sales">
      <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
    </InboxModeContext.Provider>,
  );
}

const asked = (path: string) => apiFetch.mock.calls.some(([p]) => String(p).startsWith(path));

/** The one «اشتراك جديد» (no separate «رابط دفع» anywhere, owner 2026-10-29), its step open. */
async function subscribe() {
  fireEvent.click(await screen.findByRole('button', { name: t.salesMoney.newSubscription }));
  return within(await screen.findByRole('dialog', { name: t.salesMoney.newSubscription }));
}

describe('the payment method inside «اشتراك جديد» (docs/30, the online one in the TEST BUILD ONLY)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    vi.unstubAllEnvs();
  });

  it('a normal build: no «طريقة الدفع», and /stripe/feature is never asked', async () => {
    open(true);
    const step = await subscribe();
    expect(await step.findByText(t.salesMoney.price)).toBeTruthy();
    expect(step.queryByRole('group', { name: t.payments.method })).toBeNull();
    expect(step.queryByRole('button', { name: t.paymentLinks.create })).toBeNull();
    expect(asked('/stripe/feature')).toBe(false);
  });

  it('the test build with the API off: still the bank transfer only', async () => {
    vi.stubEnv('VITE_FEATURE_STRIPE', '1');
    open(false);
    const step = await subscribe();
    await vi.waitFor(() => expect(asked('/stripe/feature')).toBe(true));
    expect(await step.findByText(t.salesMoney.price)).toBeTruthy();
    expect(step.queryByRole('group', { name: t.payments.method })).toBeNull();
  });

  it('both on: «اشتراك جديد» offers «تحويل بنكي» (picked) and «دفع إلكتروني»', async () => {
    vi.stubEnv('VITE_FEATURE_STRIPE', '1');
    open(true);
    const step = await subscribe();
    const method = within(await step.findByRole('group', { name: t.payments.method }));
    expect(method.getByRole('button', { name: t.enums.paymentMethod.bank, pressed: true })).toBeTruthy();
    fireEvent.click(method.getByRole('button', { name: t.salesMoney.payOnline }));
    expect(await step.findByRole('button', { name: t.paymentLinks.create })).toBeTruthy();
  });
});
