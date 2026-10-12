import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PAYMENT, WEEKLY } from '@/features/subscriptions/money-fixture';
import { t } from '@/lib/i18n';
import { paidAtFor, uploadReceipt } from './api';
import { PaymentsPage } from './PaymentsPage';
import { ReceiptField, receiptProblem } from './ReceiptField';
import type { PaymentsUrlSearch } from './search';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
const uploadToSignedUrl = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));
vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl }) } } }));

const SIGNED = { bucket: 'receipts', path: 'sub-1/abc.jpg', token: 'tok', signed_url: 'https://x' };
const file = (type: string, size = 2048) => new File([new Uint8Array(size)], 'receipt.jpg', { type });
const page = <T,>(items: T[]) => ({ items, total: items.length, page: 1, pageSize: 20 });

const STUDENT = { id: 'stu-1', name: 'سهيلة', code: 'AB-0183', guardian_name: 'أم سهيلة' };

/** The route's URL search, held in state. */
function Harness() {
  const [search, setSearch] = useState<PaymentsUrlSearch>({});
  return <PaymentsPage search={search} onSearch={(patch) => setSearch((s) => ({ ...s, ...patch }))} />;
}

function renderPage() {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/subscriptions')) return page([WEEKLY]);
    if (path.startsWith('/students')) return page([STUDENT]);
    if (path.endsWith('/receipt')) return { url: 'https://signed/receipt.jpg', expires_at: '2026-10-02T10:00:00Z' };
    return { ...page([PAYMENT]), totals: [{ currency: 'SAR', net: 145, payments: 145, refunds: 0 }] };
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Harness />
    </QueryClientProvider>,
  );
}

describe('receipts (R-PAY-01, R-MOB-02)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    uploadToSignedUrl.mockReset();
  });

  it('upload: a signed URL for the package, then the file straight to the bucket', async () => {
    apiSend.mockResolvedValue(SIGNED);
    uploadToSignedUrl.mockResolvedValue({ data: {}, error: null });
    const f = file('image/jpeg');
    expect(await uploadReceipt({ subscriptionId: 'sub-1', file: f })).toBe('sub-1/abc.jpg');
    expect(apiSend).toHaveBeenCalledWith('POST', '/payments/receipt-upload-url', { subscriptionId: 'sub-1', mime: 'image/jpeg', size: 2048 });
    expect(uploadToSignedUrl).toHaveBeenCalledWith('sub-1/abc.jpg', 'tok', f, { contentType: 'image/jpeg' });
  });

  it('a failed upload throws (the payment is not recorded)', async () => {
    apiSend.mockResolvedValue(SIGNED);
    uploadToSignedUrl.mockResolvedValue({ data: null, error: new Error('denied') });
    await expect(uploadReceipt({ subscriptionId: 'sub-1', file: file('image/png') })).rejects.toThrow('denied');
  });

  it('type and size are checked before uploading', () => {
    expect(receiptProblem(null)).toBeNull();
    expect(receiptProblem(file('image/jpeg'))).toBeNull();
    expect(receiptProblem(file('audio/mpeg'))).toBe('receipt_type');
    expect(receiptProblem(file('application/pdf', 10 * 1024 * 1024 + 1))).toBe('receipt_too_large');
  });

  it('the picker previews an image and can drop it before saving', () => {
    URL.createObjectURL = vi.fn(() => 'blob:receipt');
    URL.revokeObjectURL = vi.fn();
    const onChange = vi.fn();
    const { rerender } = render(<ReceiptField file={null} onChange={onChange} />);
    const f = file('image/jpeg');
    fireEvent.change(screen.getByLabelText(t.payments.addReceipt), { target: { files: [f] } });
    expect(onChange).toHaveBeenCalledWith(f);
    rerender(<ReceiptField file={f} onChange={onChange} />);
    expect(screen.getByRole('img', { name: t.payments.receipt }).getAttribute('src')).toBe('blob:receipt');
    fireEvent.click(screen.getByRole('button', { name: t.payments.removeReceipt }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('paid date: today is now, an earlier day is noon Riyadh (never in the future)', () => {
    const now = new Date('2026-10-02T09:00:00Z');
    expect(paidAtFor('2026-10-02', now)).toBe('2026-10-02T09:00:00.000Z');
    expect(paidAtFor('2026-09-30', now)).toBe('2026-09-30T09:00:00.000Z');
  });
});

describe('PaymentsPage', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('lists payments and previews a receipt through a signed URL', async () => {
    renderPage();
    const row = (await screen.findByText(t.enums.paymentMethod.bank, { selector: 'td' })).closest('tr');
    if (!row) throw new Error('row missing');
    expect(within(row).getByText(t.enums.paymentMethod.bank)).toBeTruthy();
    expect(within(row).getByText('مدير')).toBeTruthy();
    fireEvent.click(within(row).getByRole('button', { name: t.payments.viewReceipt }));
    const dialog = await screen.findByRole('dialog', { name: t.payments.receipt });
    expect((await within(dialog).findByRole('img')).getAttribute('src')).toBe('https://signed/receipt.jpg');
    expect(apiFetch).toHaveBeenCalledWith('/payments/pay-1/receipt');
  });

  it('records a payment: search the student, their open package is chosen', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: t.payments.record }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('searchbox', { name: t.payments.mobile.chooseStudent }), { target: { value: 'سهيلة' } });
    fireEvent.click(await within(dialog).findByRole('button', { name: /سهيلة/ }));
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/subscriptions?studentId=stu-1&pageSize=100'));
    await within(dialog).findByRole('option', { name: /\d/ });
    // The amount is prefilled after the package is chosen (an effect): wait for it, never read it once.
    await vi.waitFor(() =>
      expect((within(dialog).getByRole('textbox', { name: new RegExp(t.payments.amount) }) as HTMLInputElement).value).toBe('145'),
    );
    apiSend.mockResolvedValue(PAYMENT);
    fireEvent.click(within(dialog).getByRole('button', { name: t.payments.record }));
    await vi.waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/payments', expect.objectContaining({ subscriptionId: 'sub-1', amount: 145 })),
    );
    expect(await screen.findByText(t.payments.saved)).toBeTruthy();
  });

  it('deletes a payment only after the confirm', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: `${t.common.delete} سهيلة` }));
    const dialog = await screen.findByRole('dialog', { name: t.finance.deletePaymentTitle });
    apiSend.mockResolvedValue(undefined);
    fireEvent.click(within(dialog).getByRole('button', { name: t.common.delete }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('DELETE', '/payments/pay-1'));
  });
});
