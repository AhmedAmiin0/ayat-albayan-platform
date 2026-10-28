import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { SALES_QUOTE, student } from '../sales-money-fixture';
import { answer, LINK_QUOTE, openDialog } from './link-dialog.fixture';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const P = t.paymentLinks;
const ref = P.referencePrice.replace('{amount}', String(SALES_QUOTE.afterDiscount)).replace('{currency}', 'ر.س');
const amountBox = () => screen.getByRole('spinbutton', { name: P.agreedAmount.replace('{currency}', 'ر.س') }) as HTMLInputElement;
const create = () => fireEvent.click(screen.getByRole('button', { name: P.create }));

describe('«رابط دفع»: the form', () => {
  afterEach(() => apiSend.mockReset());

  it('the calculator price is the reference; the agreed amount starts from it; the lowest allowed is said', async () => {
    answer(apiSend);
    openDialog();
    expect(await screen.findByText(ref)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/sales/payment-links/quote', expect.objectContaining({ studentId: student().id }));
    expect(screen.getByText(P.minAmount.replace('{amount}', String(LINK_QUOTE.min_amount)).replace('{currency}', 'ر.س'))).toBeTruthy();
    expect(amountBox().value).toBe(String(SALES_QUOTE.afterDiscount));
  });

  it('refuses an amount below the cap or not above 0, before anything is created', async () => {
    answer(apiSend);
    openDialog();
    await screen.findByText(ref);
    fireEvent.change(amountBox(), { target: { value: String(Number(LINK_QUOTE.min_amount) - 1) } });
    create();
    expect(screen.getByText(P.error.discount_too_large)).toBeTruthy();
    fireEvent.change(amountBox(), { target: { value: '0' } });
    expect(screen.getByText(P.web.amountPositive)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalledWith('POST', '/sales/payment-links', expect.anything());
  });

  it('creates the link with the agreed amount in the quote currency, then shows it beside the reference', async () => {
    answer(apiSend);
    openDialog();
    await screen.findByText(ref);
    fireEvent.change(amountBox(), { target: { value: '270' } });
    create();
    await screen.findByTestId('link-amount');
    const dialog = screen.getByRole('dialog', { name: P.title });
    expect(within(dialog).getByTestId('link-amount').textContent).toContain('270');
    expect(within(dialog).getByTestId('link-reference').textContent).toContain(String(SALES_QUOTE.afterDiscount));
    const body = apiSend.mock.calls.find(([, path]) => path === '/sales/payment-links')?.[2] as Record<string, unknown>;
    expect(body).toMatchObject({ studentId: student().id, kind: 'new', amount: 270, currency: SALES_QUOTE.currency });
    expect(typeof body['clientRequestId']).toBe('string');
    expect(within(dialog).getByText('https://app.example.com/pay/tok_1')).toBeTruthy();
  });

  it('a renewal opens on the student’s renewal pricing and is sent as one', async () => {
    answer(apiSend);
    const renewal = { pkg: 'premium', count: 10, duration: 60, discount: 10, country: 'AE' } as const;
    openDialog({ students: [student({ status: 'active', renew_due: true, renewal })] });
    expect(screen.getByRole('button', { name: P.kind.renewal, pressed: true })).toBeTruthy();
    await screen.findByText(ref);
    const quoteBody = apiSend.mock.calls.find(([, path]) => path === '/sales/payment-links/quote')?.[2] as { pricing: Record<string, unknown> };
    expect(quoteBody.pricing).toMatchObject({ tier: 'premium', duration: 60, discount: 10, country: 'AE' });
    create();
    await screen.findByText(P.sendInChat);
    expect(apiSend).toHaveBeenCalledWith('POST', '/sales/payment-links', expect.objectContaining({ kind: 'renewal' }));
  });

  it('an API refusal is said in the form', async () => {
    answer(apiSend);
    openDialog();
    await screen.findByText(ref);
    apiSend.mockRejectedValueOnce(Object.assign(new Error('x'), {}));
    create();
    expect(await screen.findByText(P.error.generic)).toBeTruthy();
  });
});
