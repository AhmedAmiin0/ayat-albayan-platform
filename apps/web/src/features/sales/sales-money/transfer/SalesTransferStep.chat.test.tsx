import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { CHAT_RECEIPTS, OPEN_SUB, paymentView, student } from '@/features/sales/sales-money/sales-money-fixture';
import { SalesMoneyFlow } from '@/features/sales/sales-money/SalesMoneyFlow';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

const PATH = `receipts/${OPEN_SUB.id}/chat.jpg`;
const payments = () => apiSend.mock.calls.filter(([, path]) => path === '/sales/payments').map((c) => c[2] as Record<string, unknown>);

function open(status: 'active' | 'trial' = 'active') {
  routeFetch(apiFetch, [
    ['/settings', {}],
    ['/sales/money/chat-receipts/msg-img', { url: 'https://signed/thumb.jpg', expires_at: '2026-10-12T10:00:00Z', mime: 'image/jpeg' }],
    ['/sales/money/chat-receipts?', CHAT_RECEIPTS],
  ]);
  apiSend.mockImplementation(async (_m: string, path: string) =>
    path === '/sales/payments/receipt-from-chat' ? { receipt_path: PATH } : paymentView(status),
  );
  renderWithClient(<SalesMoneyFlow start="transfer" students={[student({ open: [OPEN_SUB] })]} onClose={vi.fn()} />);
  const dialog = within(screen.getByRole('dialog', { name: t.salesMoney.stepTransfer }));
  const save = () => fireEvent.click(dialog.getByRole('button', { name: t.salesMoney.saveTransfer }));
  return { dialog, save };
}

describe('step 2 «سجّل التحويل البنكي» with attachments from the chat (R-ASST-04)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('no attachment is fine (old students have no receipt): posts with attachments []; the amount starts at what is due', async () => {
    const { dialog, save } = open();
    expect(dialog.getByRole<HTMLInputElement>('textbox', { name: t.salesMoney.amount }).value).toBe('290');
    expect(dialog.getByText(t.salesMoney.attachments)).toBeTruthy();
    save();
    await vi.waitFor(() => expect(payments()).toHaveLength(1));
    expect(payments()[0]).toMatchObject({ subscriptionId: OPEN_SUB.id, amount: 290, attachments: [] });
    expect(payments()[0]).not.toHaveProperty('receiptPath');
    expect(await screen.findByRole('dialog', { name: t.salesMoney.becameSubscribed })).toBeTruthy();
  });

  it('an expired chat file is disabled; picking one copies it, and the payment carries its path, never kind / method', async () => {
    const { dialog, save } = open();
    fireEvent.click(dialog.getByRole('button', { name: t.salesMoney.receiptFromChat }));
    const expired = await dialog.findByRole<HTMLButtonElement>('button', { name: (n) => n.includes(t.salesMoney.receiptExpired) });
    expect(expired.disabled).toBe(true);
    await vi.waitFor(() => expect(document.querySelector('img')?.getAttribute('src')).toBe('https://signed/thumb.jpg'));
    fireEvent.click(dialog.getByRole('button', { name: (n) => n.startsWith('تحويل') }));
    expect(await dialog.findByText(t.salesMoney.attachmentN.replace('{n}', '1'))).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/sales/payments/receipt-from-chat', { subscriptionId: OPEN_SUB.id, messageId: 'msg-img' });
    expect(apiFetch).toHaveBeenCalledWith(`/sales/money/chat-receipts?studentId=${OPEN_SUB.student.id}`);

    save();
    await vi.waitFor(() => expect(payments()).toHaveLength(1));
    const body = payments()[0] ?? {};
    expect(body).toMatchObject({ subscriptionId: OPEN_SUB.id, amount: 290, currency: 'SAR', attachments: [PATH], note: null });
    expect(body).not.toHaveProperty('receiptPath');
    expect(body.clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body).not.toHaveProperty('kind');
    expect(body).not.toHaveProperty('method');
    expect(body).not.toHaveProperty('invoiceId');
  });

  it('a message already picked is shown pressed and never copied again', async () => {
    const { dialog } = open();
    fireEvent.click(dialog.getByRole('button', { name: t.salesMoney.receiptFromChat }));
    fireEvent.click(await dialog.findByRole('button', { name: (n) => n.startsWith('تحويل') }));
    await dialog.findByText(t.salesMoney.attachmentN.replace('{n}', '1'));
    fireEvent.click(dialog.getByRole('button', { name: t.salesMoney.receiptFromChat }));
    const again = await dialog.findByRole('button', { name: (n) => n.startsWith('تحويل') });
    expect(again.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(again);
    const copies = () => apiSend.mock.calls.filter(([, path]) => path === '/sales/payments/receipt-from-chat');
    await vi.waitFor(() => expect(copies()).toHaveLength(1));
    expect(dialog.queryByText(t.salesMoney.attachmentN.replace('{n}', '2'))).toBeNull();
  });

  it('success: «أصبح الطالب مشتركًا» and a link to «مدفوعاتي»', async () => {
    const { dialog, save } = open('active');
    fireEvent.click(dialog.getByRole('button', { name: t.salesMoney.receiptFromChat }));
    fireEvent.click(await dialog.findByRole('button', { name: (n) => n.startsWith('تحويل') }));
    await dialog.findByText(t.salesMoney.attachmentN.replace('{n}', '1'));
    save();
    const done = within(await screen.findByRole('dialog', { name: t.salesMoney.becameSubscribed }));
    expect(done.getByRole('link', { name: t.salesMoney.openMyPayments }).getAttribute('href')).toBe('/sales/earnings?view=payments');
  });

  it('a student not active yet: «تم تسجيل التحويل»', async () => {
    const { dialog, save } = open('trial');
    fireEvent.click(dialog.getByRole('button', { name: t.salesMoney.receiptFromChat }));
    fireEvent.click(await dialog.findByRole('button', { name: (n) => n.startsWith('تحويل') }));
    await dialog.findByText(t.salesMoney.attachmentN.replace('{n}', '1'));
    save();
    expect(await screen.findByRole('dialog', { name: t.salesMoney.transferSaved })).toBeTruthy();
  });
});
