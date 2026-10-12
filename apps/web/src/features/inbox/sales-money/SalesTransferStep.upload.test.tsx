import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithClient, routeFetch } from '../test-utils';
import { OPEN_SUB, paymentView, student } from './sales-money-fixture';
import { SalesMoneyFlow } from './SalesMoneyFlow';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
const uploadToSignedUrl = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl }) } } }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../test-utils')).MockLink }));

const SIGNED = { bucket: 'receipts', path: `${OPEN_SUB.id}/r.jpg`, token: 'tok', signed_url: 'https://x' };
const payments = () => apiSend.mock.calls.filter(([, path]) => path === '/sales/payments').map((c) => c[2] as Record<string, unknown>);

function open() {
  routeFetch(apiFetch, [['/settings', {}]]);
  uploadToSignedUrl.mockResolvedValue({ data: {}, error: null });
  renderWithClient(<SalesMoneyFlow start="transfer" students={[student({ open: [OPEN_SUB] })]} onClose={vi.fn()} />);
  const dialog = within(screen.getByRole('dialog', { name: t.salesMoney.stepTransfer }));
  const receipt = new File([new Uint8Array(16)], 'r.jpg', { type: 'image/jpeg' });
  fireEvent.change(dialog.getByLabelText(t.payments.addReceipt), { target: { files: [receipt] } });
  const save = () => fireEvent.click(dialog.getByRole('button', { name: t.salesMoney.saveTransfer }));
  return { dialog, save };
}

describe('step 2 with an uploaded receipt (R-ASST-04)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    uploadToSignedUrl.mockReset();
  });

  it('uploads through the sales signed URL once; the retry re-sends the same id and path', async () => {
    let fail = true;
    apiSend.mockImplementation(async (_m: string, path: string) => {
      if (path === '/sales/payments/receipt-upload-url') return SIGNED;
      if (fail) throw new ApiError(400, { code: 'fx_unavailable' });
      return paymentView();
    });
    const { dialog, save } = open();
    save();
    expect(await dialog.findByText(t.salesMoney.error.fx_unavailable)).toBeTruthy();
    fail = false;
    save();
    expect(await screen.findByRole('dialog', { name: t.salesMoney.becameSubscribed })).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/sales/payments/receipt-upload-url', { subscriptionId: OPEN_SUB.id, mime: 'image/jpeg', size: 16 });
    expect(uploadToSignedUrl).toHaveBeenCalledTimes(1);
    const [first, retry] = payments();
    expect(retry).toMatchObject({ clientRequestId: first?.clientRequestId, receiptPath: SIGNED.path });
  });

  it('a bad amount says why and sends nothing', () => {
    const { dialog, save } = open();
    fireEvent.change(dialog.getByRole('textbox', { name: t.salesMoney.amount }), { target: { value: '0' } });
    save();
    expect(dialog.getByText(t.salesMoney.error.amount)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });
});
