import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { OPEN_SUB, SALES_QUOTE, student } from '@/features/sales/sales-money/sales-money-fixture';
import { SalesMoneyFlow } from '@/features/sales/sales-money/SalesMoneyFlow';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: [], can: () => false }),
}));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));

const C = t.subscriptions.customPrice;
const PRICE = SALES_QUOTE.afterDiscount;
const boxName = C.label.replace('{currency}', 'ر.س');
const creates = () =>
  apiSend.mock.calls
    .filter(([, path]) => path === '/sales/subscriptions')
    .map((c) => c[2] as Record<string, unknown>);

async function open(renew = false) {
  routeFetch(apiFetch, [['/settings', {}], ['/sales/money/chat-receipts', []]]);
  apiSend.mockImplementation(async (_m: string, path: string, body: Record<string, unknown>) => {
    if (path === '/sales/subscriptions/quote') return SALES_QUOTE;
    const price = typeof body.customPrice === 'number' ? body.customPrice : PRICE;
    return { ...OPEN_SUB, price, due: price };
  });
  const kid = student({ status: 'active', renew_due: renew });
  renderWithClient(
    <SalesMoneyFlow start="subscribe" students={[kid]} studentId={kid.id} renew={renew} onClose={vi.fn()} />,
  );
  const name = renew ? t.students.renew : t.salesMoney.newSubscription;
  const dialog = within(screen.getByRole('dialog', { name }));
  await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/sales/subscriptions/quote', expect.anything()));
  return {
    dialog,
    toggle: () => fireEvent.click(dialog.getByRole('button', { name: t.paymentLinks.customAmount })),
    save: () => fireEvent.click(dialog.getByRole('button', { name: t.salesMoney.saveSubscription })),
  };
}

const box = async () => screen.findByRole<HTMLInputElement>('textbox', { name: boxName });

describe('«مبلغ مخصص» on the bank-transfer package price (owner 2026-11-02)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('off (the default): no price box, and the body has no customPrice', async () => {
    const { dialog, save } = await open();
    expect(dialog.getByRole('button', { name: t.paymentLinks.customAmount, pressed: false })).toBeTruthy();
    expect(dialog.queryByRole('textbox', { name: boxName })).toBeNull();
    save();
    await vi.waitFor(() => expect(creates()).toHaveLength(1));
    expect(creates()[0]).not.toHaveProperty('customPrice');
  });

  it('on: the box starts from the quote and the typed price is sent as customPrice', async () => {
    const { toggle, save } = await open();
    toggle();
    await vi.waitFor(async () => expect((await box()).value).toBe(String(PRICE)));
    fireEvent.change(await box(), { target: { value: '٢٥٠' } });
    save();
    await vi.waitFor(() => expect(creates()).toHaveLength(1));
    expect(creates()[0]).toMatchObject({ customPrice: 250 });
  });

  it('an invalid price is said and nothing is saved', async () => {
    const { toggle, save } = await open();
    toggle();
    fireEvent.change(await box(), { target: { value: '12.345' } });
    save();
    expect(await screen.findByText(C.invalid)).toBeTruthy();
    expect(creates()).toHaveLength(0);
  });

  it('switching it off drops the typed price: the body is today’s again', async () => {
    const { toggle, save } = await open();
    toggle();
    fireEvent.change(await box(), { target: { value: '250' } });
    toggle();
    expect(screen.queryByRole('textbox', { name: boxName })).toBeNull();
    save();
    await vi.waitFor(() => expect(creates()).toHaveLength(1));
    expect(creates()[0]).not.toHaveProperty('customPrice');
  });

  it('a renewal sends it too, and the transfer then starts at the custom price', async () => {
    const { toggle, save } = await open(true);
    toggle();
    fireEvent.change(await box(), { target: { value: '250' } });
    save();
    await vi.waitFor(() => expect(creates()).toHaveLength(1));
    expect(creates()[0]).toMatchObject({ customPrice: 250 });
    const transfer = within(await screen.findByRole('dialog', { name: t.salesMoney.stepTransfer }));
    const amount = transfer.getByRole<HTMLInputElement>('textbox', { name: t.salesMoney.amount });
    expect(amount.value).toBe('250');
  });
});
