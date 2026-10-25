import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient, routeFetch } from '../test-utils';
import { OPEN_SUB, paymentView, student } from './sales-money-fixture';
import { SalesMoneyFlow } from './SalesMoneyFlow';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
const uploadToSignedUrl = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/lib/http/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl }) } } }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../test-utils')).MockLink }));

const SIGNED = { bucket: 'receipts', path: `${OPEN_SUB.id}/r.jpg`, token: 'tok', signed_url: 'https://x' };
const payments = () => apiSend.mock.calls.filter(([, path]) => path === '/sales/payments').map((c) => c[2] as Record<string, unknown>);

function open() {
  routeFetch(apiFetch, [['/settings', {}]]);
  uploadToSignedUrl.mockResolvedValue({ data: {}, error: null });
  renderWithClient(<SalesMoneyFlow start="transfer" students={[student({ open: [OPEN_SUB] })]} onClose={vi.fn()} />);
  const dialog = within(screen.getByRole('dialog', { name: t.salesMoney.stepTransfer }));
  const receipt = new File([new Uint8Array(16)], 'r.jpg', { type: 'image/jpeg' });
  fireEvent.change(dialog.getByLabelText(t.salesMoney.attachmentsAdd), { target: { files: [receipt] } });
  const save = () => fireEvent.click(dialog.getByRole('button', { name: t.salesMoney.saveTransfer }));
  return { dialog, save };
}

describe('step 2 with uploaded attachments (R-ASST-04)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    uploadToSignedUrl.mockReset();
  });

  it('uploads through the sales signed URL once; the retry re-sends the same id and path', async () => {
    let fail = true;
    apiSend.mockImplementation(async (_m: string, path: string) => {
      if (path === '/sales/payments/receipt-upload-url') return SIGNED;
      if (fail) throw new ApiError(400, { code: 'currency_mismatch', currency: 'SAR' });
      return paymentView();
    });
    const { dialog, save } = open();
    save();
    expect(await dialog.findByText(t.salesMoney.error.currency_mismatch.replace('{currency}', 'SAR'))).toBeTruthy();
    expect(dialog.queryByText(/\{currency\}/)).toBeNull();
    fail = false;
    save();
    expect(await screen.findByRole('dialog', { name: t.salesMoney.becameSubscribed })).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/sales/payments/receipt-upload-url', { subscriptionId: OPEN_SUB.id, mime: 'image/jpeg', size: 16 });
    expect(uploadToSignedUrl).toHaveBeenCalledTimes(1);
    const [first, retry] = payments();
    expect(retry).toMatchObject({ clientRequestId: first?.clientRequestId, attachments: [SIGNED.path] });
  });

  it('adds files to the list (a .txt refused), one removed; the rest are posted', async () => {
    let n = 0;
    apiSend.mockImplementation(async (_m: string, path: string) =>
      path === '/sales/payments/receipt-upload-url' ? { ...SIGNED, path: `${OPEN_SUB.id}/${(n += 1)}.jpg` } : paymentView(),
    );
    const { dialog, save } = open();
    const pdf = new File([new Uint8Array(8)], 'b.pdf', { type: 'application/pdf' });
    const txt = new File(['x'], 'c.txt', { type: 'text/plain' });
    fireEvent.change(dialog.getByLabelText(t.salesMoney.attachmentsAdd), { target: { files: [pdf, txt] } });
    expect(dialog.getByText(t.salesMoney.error.receipt_type)).toBeTruthy();
    expect(dialog.getByText('b.pdf')).toBeTruthy();
    fireEvent.click(dialog.getByRole('button', { name: `${t.salesMoney.attachmentRemove} ${t.salesMoney.attachmentN.replace('{n}', '1')}` }));
    expect(dialog.queryByText('r.jpg')).toBeNull();
    save();
    await vi.waitFor(() => expect(payments()).toHaveLength(1));
    expect(payments()[0]).toMatchObject({ attachments: [`${OPEN_SUB.id}/1.jpg`] });
    expect(uploadToSignedUrl).toHaveBeenCalledWith(`${OPEN_SUB.id}/1.jpg`, 'tok', pdf, { contentType: 'application/pdf' });
  });

  it('a bad amount says why and sends nothing', () => {
    const { dialog, save } = open();
    fireEvent.change(dialog.getByRole('textbox', { name: t.salesMoney.amount }), { target: { value: '0' } });
    save();
    expect(dialog.queryByRole('combobox', { name: t.salesMoney.currency })).toBeNull();
    const currency = dialog.getByRole<HTMLInputElement>('textbox', { name: t.salesMoney.currency });
    expect([currency.value, currency.readOnly]).toEqual([OPEN_SUB.currency, true]);
    expect(dialog.getByText(t.salesMoney.error.amount)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });
});
