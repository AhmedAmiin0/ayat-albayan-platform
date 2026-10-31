import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { OPEN_SUB, paymentView, student } from '@/features/sales/sales-money/sales-money-fixture';
import { SalesMoneyFlow } from '@/features/sales/sales-money/SalesMoneyFlow';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

// Owner 2026-10-28 («Why is this unpaid»): 81 SAR, a receipt of 80 leaves it unpaid; say so before saving.
const SUB = { ...OPEN_SUB, price: 81, due: 81 };
const SHORT = 'المبلغ أقل من المستحق بـ 1 ر.س، ستبقى الباقة غير مدفوعة حتى يكتمل المبلغ';
const payments = () => apiSend.mock.calls.filter(([, path]) => path === '/sales/payments').map((c) => c[2] as Record<string, unknown>);

function open(sub = SUB) {
  routeFetch(apiFetch, [['/settings', {}], ['/sales/money/chat-receipts?', []]]);
  apiSend.mockResolvedValue(paymentView('active'));
  renderWithClient(<SalesMoneyFlow start="transfer" students={[student({ open: [sub] })]} onClose={vi.fn()} />);
  const dialog = within(screen.getByRole('dialog', { name: t.salesMoney.stepTransfer }));
  const amount = (value: string) => fireEvent.change(dialog.getByRole('textbox', { name: t.salesMoney.amount }), { target: { value } });
  return { dialog, amount };
}

describe('step 2: a transfer short of what is due', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('80 against 81 due: the note shows, and saving still posts', async () => {
    const { dialog, amount } = open();
    expect(dialog.queryByText(SHORT)).toBeNull();
    amount('80');
    expect(dialog.getByText(SHORT)).toBeTruthy();
    fireEvent.click(dialog.getByRole('button', { name: t.salesMoney.saveTransfer }));
    await vi.waitFor(() => expect(payments()).toHaveLength(1));
    expect(payments()[0]).toMatchObject({ amount: 80 });
  });

  it('an amount covering what is due: no note', () => {
    const { dialog, amount } = open();
    amount('81');
    expect(dialog.queryByText(SHORT)).toBeNull();
  });

  it('a part-paid package says how much came in and what is left (the picker and the package line)', () => {
    const { dialog } = open({ ...SUB, paid: 80, due: 1 });
    expect(dialog.getAllByText(/مدفوعة جزئيًا: 80 من 81 ر.س · الباقي 1/)).toHaveLength(2);
  });
});
