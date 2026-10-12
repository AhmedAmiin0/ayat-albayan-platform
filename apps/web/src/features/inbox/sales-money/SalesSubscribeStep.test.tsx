import { formatAmount } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { renderWithClient, routeFetch } from '../test-utils';
import { SALES_QUOTE, OPEN_SUB, student } from './sales-money-fixture';
import { SalesMoneyFlow } from './SalesMoneyFlow';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../test-utils')).MockLink }));

const creates = () => apiSend.mock.calls.filter(([, path]) => path === '/sales/subscriptions').map((c) => c[2] as Record<string, unknown>);

function open(students = [student()]) {
  routeFetch(apiFetch, [['/settings', {}], ['/sales/money/chat-receipts', []]]);
  renderWithClient(<SalesMoneyFlow start="subscribe" students={students} onClose={vi.fn()} />);
  const dialog = within(screen.getByRole('dialog', { name: t.salesMoney.newSubscription }));
  const save = () => fireEvent.click(dialog.getByRole('button', { name: t.salesMoney.saveSubscription }));
  return { dialog, save };
}

describe('step 1 «اشتراك جديد» from a sales chat (R-ASST-01)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('her only student is preselected; the price is the sales quote of the calculator inputs', async () => {
    apiSend.mockResolvedValue(SALES_QUOTE);
    const { dialog } = open();
    expect(dialog.getByRole<HTMLSelectElement>('combobox', { name: t.salesMoney.pickChild }).value).toBe(OPEN_SUB.student.id);
    const pills = within(dialog.getByRole('group', { name: t.subscriptions.discount })).getAllByRole('button');
    expect(pills.map((b) => b.textContent)).toEqual(['0', '5', '10', '15'].map((d) => t.pricing.discounts[d as '0']));
    expect(dialog.queryByRole('spinbutton', { name: t.subscriptions.discount })).toBeNull();
    fireEvent.click(dialog.getByRole('button', { name: t.pricing.discounts['10'] }));
    expect(dialog.getByRole('button', { name: t.pricing.discounts['10'] }).getAttribute('aria-pressed')).toBe('true');
    expect(await dialog.findByText(formatAmount(SALES_QUOTE.afterDiscount))).toBeTruthy();
    expect(dialog.getByText(t.salesMoney.price)).toBeTruthy();
    expect(dialog.getByText(t.salesMoney.priceHint)).toBeTruthy();
    await vi.waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/sales/subscriptions/quote', {
        studentId: OPEN_SUB.student.id,
        pricing: { tier: 'standard', duration: 45, discount: 10 },
      }),
    );
  });

  it('two children: nothing is saved until she picks one', () => {
    const { dialog } = open([student(), student({ id: 'other', name: 'يوسف', code: 'AB-0190' })]);
    expect(dialog.getByRole<HTMLSelectElement>('combobox', { name: t.salesMoney.pickChild }).value).toBe('');
    expect(dialog.getByRole<HTMLButtonElement>('button', { name: t.salesMoney.saveSubscription }).disabled).toBe(true);
  });

  it('saves with a clientRequestId, re-sent unchanged on the retry, then opens the transfer step', async () => {
    let fail = true;
    apiSend.mockImplementation(async (_m: string, path: string) => {
      if (path === '/sales/subscriptions/quote') return SALES_QUOTE;
      if (fail) throw new Error('502, the package may exist');
      return OPEN_SUB;
    });
    const { dialog, save } = open();
    save();
    await vi.waitFor(() => expect(creates()).toHaveLength(1));
    expect(await dialog.findByText(t.salesMoney.error.generic)).toBeTruthy();
    fail = false;
    save();
    await vi.waitFor(() => expect(creates()).toHaveLength(2));
    const [first, retry] = creates();
    expect(first).toMatchObject({ studentId: OPEN_SUB.student.id, pricing: { tier: 'standard' }, startsOn: expect.any(String) });
    expect(first?.clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(retry?.clientRequestId).toBe(first?.clientRequestId);
    expect(Object.keys(first ?? {}).sort()).toEqual(['clientRequestId', 'pricing', 'startsOn', 'studentId']);
    expect(await screen.findByRole('dialog', { name: t.salesMoney.stepTransfer })).toBeTruthy();
  });
});
