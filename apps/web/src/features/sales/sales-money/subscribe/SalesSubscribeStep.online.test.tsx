import type { SalesFamilyStudent } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { answer, LINK_QUOTE } from '@/features/sales/sales-money/payment-link/link.fixture';
import { SALES_QUOTE, student } from '@/features/sales/sales-money/sales-money-fixture';
import { SalesMoneyFlow } from '@/features/sales/sales-money/SalesMoneyFlow';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: [], can: (p: string) => p === 'subscriptions.set_start_date' }),
}));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

const P = t.paymentLinks;
const TRIAL = '7a000000-0000-4000-8000-000000000001';
const ref = P.referencePrice.replace('{amount}', String(SALES_QUOTE.afterDiscount)).replace('{currency}', 'ر.س');
const amountBox = () => screen.getByRole('spinbutton', { name: P.agreedAmount.replace('{currency}', 'ر.س') }) as HTMLInputElement;
const posted = (path: string) => apiSend.mock.calls.filter(([, p]) => p === path).map((c) => c[2] as Record<string, unknown>);

/** «اشتراك جديد» in the Stripe test build with the API's switch on, «دفع إلكتروني» picked. */
async function online(students: SalesFamilyStudent[] = [student({ teacher_id: TRIAL })]) {
  vi.stubEnv('VITE_FEATURE_STRIPE', '1');
  routeFetch(apiFetch, [
    ['/stripe/feature', { stripe: true }],
    ['/settings', {}],
    ['/sales/money/chat-receipts', []],
    ['/sales/subscriptions/teachers', [{ id: TRIAL, name: 'أبرار' }]],
  ]);
  answer(apiSend);
  renderWithClient(<SalesMoneyFlow start="subscribe" students={students} phone={PHONE} sessionOpen onClose={vi.fn()} />);
  const dialog = within(screen.getByRole('dialog', { name: t.salesMoney.newSubscription }));
  const method = within(await dialog.findByRole('group', { name: t.payments.method }));
  expect(method.getByRole('button', { name: t.enums.paymentMethod.bank, pressed: true })).toBeTruthy();
  fireEvent.click(method.getByRole('button', { name: t.salesMoney.payOnline }));
  expect(await screen.findByText(ref)).toBeTruthy();
  return dialog;
}

async function create() {
  const button = screen.getByRole<HTMLButtonElement>('button', { name: P.create });
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  fireEvent.click(button);
}

describe('«اشتراك جديد» → «دفع إلكتروني» (owner 2026-10-29, the Stripe test build)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    vi.unstubAllEnvs();
  });

  it('the calculator price is the reference; the agreed amount starts from it; the lowest allowed is said', async () => {
    await online();
    expect(apiSend).toHaveBeenCalledWith('POST', '/sales/payment-links/quote', expect.objectContaining({ studentId: student().id }));
    expect(screen.getByText(P.minAmount.replace('{amount}', String(LINK_QUOTE.min_amount)).replace('{currency}', 'ر.س'))).toBeTruthy();
    expect(amountBox().value).toBe(String(SALES_QUOTE.afterDiscount));
    expect(screen.queryByText(t.salesMoney.price)).toBeNull();
  });

  it('refuses an amount below the cap or not above 0, before anything is created', async () => {
    await online();
    fireEvent.change(amountBox(), { target: { value: String(Number(LINK_QUOTE.min_amount) - 1) } });
    await create();
    expect(screen.getByText(P.error.discount_too_large)).toBeTruthy();
    fireEvent.change(amountBox(), { target: { value: '0' } });
    expect(screen.getByText(P.web.amountPositive)).toBeTruthy();
    expect(posted('/sales/payment-links')).toHaveLength(0);
  });

  it('makes the link from the step’s own fields (no package POST, no phone), then shows it to send', async () => {
    await online();
    fireEvent.change(amountBox(), { target: { value: '270' } });
    await create();
    const made = within(await screen.findByRole('dialog', { name: P.title }));
    expect(made.getByTestId('link-amount').textContent).toContain('270');
    expect(made.getByText('https://app.example.com/pay/tok_1')).toBeTruthy();
    const [body] = posted('/sales/payment-links');
    expect(body).toMatchObject({ studentId: student().id, amount: 270, currency: SALES_QUOTE.currency, teacherId: TRIAL });
    expect(body?.['startsOn']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof body?.['clientRequestId']).toBe('string');
    expect(body).not.toHaveProperty('phone');
    expect(posted('/sales/subscriptions')).toHaveLength(0);
  });

  it('a child due for a renewal: no kind is sent, the API derives it from her priced packages', async () => {
    await online([student({ status: 'active', renew_due: true })]);
    await create();
    await screen.findByRole('dialog', { name: P.title });
    expect(posted('/sales/payment-links')[0]).toMatchObject({ studentId: student().id });
    expect(posted('/sales/payment-links')[0]).not.toHaveProperty('kind');
  });

  it('an API refusal is said in the form', async () => {
    await online();
    apiSend.mockRejectedValueOnce(new Error('x'));
    await create();
    expect(await screen.findByText(P.error.generic)).toBeTruthy();
  });

  it('a refusal with the subscribe step’s own code (the teacher gone inactive) says it, never «try again»', async () => {
    await online();
    apiSend.mockRejectedValueOnce(new ApiError(400, { code: 'teacher_not_found' }));
    await create();
    expect(await screen.findByText(t.salesMoney.error.teacher_not_found)).toBeTruthy();
  });

  it('a child listed through sales.renew_any (mine: false): no method to pick, the bank transfer only', async () => {
    vi.stubEnv('VITE_FEATURE_STRIPE', '1');
    routeFetch(apiFetch, [['/stripe/feature', { stripe: true }], ['/settings', {}], ['/sales/subscriptions/teachers', []]]);
    answer(apiSend);
    renderWithClient(<SalesMoneyFlow start="subscribe" students={[student({ mine: false })]} phone={PHONE} onClose={vi.fn()} />);
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/stripe/feature'));
    expect(await screen.findByText(t.salesMoney.price)).toBeTruthy();
    expect(screen.queryByRole('group', { name: t.payments.method })).toBeNull();
  });
});
