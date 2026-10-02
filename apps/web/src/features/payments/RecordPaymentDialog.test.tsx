import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PAYMENT, WEEKLY } from '@/features/subscriptions/money-fixture';
import { t } from '@/lib/i18n';
import { RecordPaymentDialog } from './RecordPaymentDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
const uploadToSignedUrl = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));
vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl }) } } }));

const SIGNED = { bucket: 'receipts', path: 'sub-1/abc.jpg', token: 'tok', signed_url: 'https://x' };
const TWIN = { ...WEEKLY, id: 'sub-2', student: { id: 'stu-2', code: 'AB-0210', name: 'سهيلة' } };

function open(subscription?: typeof WEEKLY) {
  apiFetch.mockResolvedValue({ items: [WEEKLY, TWIN], total: 2, page: 1, pageSize: 100 });
  const onSaved = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RecordPaymentDialog subscription={subscription} onClose={vi.fn()} onSaved={onSaved} />
    </QueryClientProvider>,
  );
  const dialog = screen.getByRole('dialog');
  const amount = within(dialog).getByRole('textbox', { name: new RegExp(t.payments.amount) });
  const save = () => fireEvent.click(within(dialog).getByRole('button', { name: t.payments.record }));
  return { dialog, amount, save, onSaved };
}

const posts = () => apiSend.mock.calls.filter(([, path]) => path === '/payments');

describe('RecordPaymentDialog (R-PAY-01)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    uploadToSignedUrl.mockReset();
  });

  it('two students with the same name are told apart by their code', async () => {
    const { dialog } = open();
    const options = await within(dialog).findAllByRole('option', { name: /سهيلة/ });
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining('AB-0183'),
      expect.stringContaining('AB-0210'),
    ]);
  });

  it('Arabic digits are read («١٤٥» → 145)', async () => {
    const { amount, save } = open(WEEKLY);
    fireEvent.change(amount, { target: { value: '١٤٥' } });
    apiSend.mockResolvedValue(PAYMENT);
    save();
    await vi.waitFor(() => expect(posts()[0]?.[2]).toMatchObject({ amount: 145, subscriptionId: 'sub-1' }));
  });

  it('an empty or bad amount says why, marks the field, and sends nothing', () => {
    const { dialog, amount, save } = open(WEEKLY);
    fireEvent.change(amount, { target: { value: '' } });
    save();
    expect(within(dialog).getByText(t.common.required)).toBeTruthy();
    expect(amount.getAttribute('aria-invalid')).toBe('true');
    fireEvent.change(amount, { target: { value: '12.345' } });
    save();
    expect(within(dialog).getByText(t.payments.mobile.amountInvalid)).toBeTruthy();
    expect(posts()).toHaveLength(0);
  });

  it('a lost reply: says it may be saved; the retry re-sends the same id and the same receipt', async () => {
    const { dialog, save, onSaved } = open(WEEKLY);
    const receipt = new File([new Uint8Array(16)], 'r.jpg', { type: 'image/jpeg' });
    fireEvent.change(within(dialog).getByLabelText(t.payments.addReceipt), { target: { files: [receipt] } });
    uploadToSignedUrl.mockResolvedValue({ data: {}, error: null });
    apiSend.mockImplementation(async (_m: string, path: string) => {
      if (path === '/payments/receipt-upload-url') return SIGNED;
      throw new TypeError('Failed to fetch');
    });
    save();
    expect(await within(dialog).findByText(t.payments.mobile.offline)).toBeTruthy();

    apiSend.mockImplementation(async (_m: string, path: string) => (path === '/payments' ? PAYMENT : SIGNED));
    save();
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [first, retry] = posts().map((c) => c[2] as { clientRequestId: string; receiptPath: string });
    expect(first?.clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(retry).toMatchObject({ clientRequestId: first?.clientRequestId, receiptPath: 'sub-1/abc.jpg' });
    expect(uploadToSignedUrl).toHaveBeenCalledTimes(1);
  });
});
