import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { answer } from '@/features/sales/sales-money/payment-link/link.fixture';
import { SALES_QUOTE, student } from '@/features/sales/sales-money/sales-money-fixture';
import { SalesMoneyFlow } from '@/features/sales/sales-money/SalesMoneyFlow';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: [], can: () => false }),
}));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

const P = t.paymentLinks;
const PRICE = SALES_QUOTE.afterDiscount;
const ref = P.referencePrice.replace('{amount}', String(PRICE)).replace('{currency}', 'ر.س');
const boxName = P.agreedAmount.replace('{currency}', 'ر.س');
const amountBox = () => screen.getByRole<HTMLInputElement>('spinbutton', { name: boxName });
const toggle = () => fireEvent.click(screen.getByRole('button', { name: P.customAmount }));
const posted = () => apiSend.mock.calls.filter(([, p]) => p === '/sales/payment-links').map((c) => c[2] as Record<string, unknown>);

async function online() {
  vi.stubEnv('VITE_FEATURE_STRIPE', '1');
  routeFetch(apiFetch, [
    ['/stripe/feature', { stripe: true }],
    ['/settings', {}],
    ['/sales/subscriptions/teachers', []],
  ]);
  answer(apiSend);
  renderWithClient(<SalesMoneyFlow start="subscribe" students={[student()]} phone={PHONE} sessionOpen onClose={vi.fn()} />);
  const dialog = within(screen.getByRole('dialog', { name: t.salesMoney.newSubscription }));
  const method = within(await dialog.findByRole('group', { name: t.payments.method }));
  fireEvent.click(method.getByRole('button', { name: t.salesMoney.payOnline }));
  expect(await screen.findByText(ref)).toBeTruthy();
}

async function create() {
  const button = screen.getByRole<HTMLButtonElement>('button', { name: P.create });
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  fireEvent.click(button);
}

describe('«مبلغ مخصص» beside the discount pills (owner 2026-11-01)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    vi.unstubAllEnvs();
  });

  it('off (the default): no amount box, and the link carries the calculator price after the pill', async () => {
    await online();
    expect(screen.getByRole('button', { name: P.customAmount, pressed: false })).toBeTruthy();
    expect(screen.queryByRole('spinbutton', { name: boxName })).toBeNull();
    await create();
    await vi.waitFor(() => expect(posted()).toHaveLength(1));
    expect(posted()[0]).toMatchObject({ amount: PRICE, currency: SALES_QUOTE.currency });
  });

  it('on: the box appears and its amount is the one sent', async () => {
    await online();
    toggle();
    expect(screen.getByRole('button', { name: P.customAmount, pressed: true })).toBeTruthy();
    fireEvent.change(amountBox(), { target: { value: '275' } });
    await create();
    await vi.waitFor(() => expect(posted()).toHaveLength(1));
    expect(posted()[0]).toMatchObject({ amount: 275 });
  });

  it('switching it off drops the typed amount: the price is sent, and on again starts from the price', async () => {
    await online();
    toggle();
    fireEvent.change(amountBox(), { target: { value: '275' } });
    toggle();
    expect(screen.queryByRole('spinbutton', { name: boxName })).toBeNull();
    toggle();
    expect(amountBox().value).toBe(String(PRICE));
    toggle();
    await create();
    await vi.waitFor(() => expect(posted()).toHaveLength(1));
    expect(posted()[0]).toMatchObject({ amount: PRICE });
  });

  it('the API’s cap refusal is said in the form', async () => {
    await online();
    toggle();
    apiSend.mockRejectedValueOnce(new ApiError(400, { code: 'discount_too_large' }));
    await create();
    expect(await screen.findByText(P.error.discount_too_large)).toBeTruthy();
  });
});
