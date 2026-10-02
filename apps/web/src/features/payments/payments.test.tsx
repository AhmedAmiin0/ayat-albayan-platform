import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PAYMENT, WEEKLY } from '@/features/subscriptions/money-fixture';
import { t } from '@/lib/i18n';
import { paidAtFor, uploadReceipt } from './api';
import { PaymentsPage } from './PaymentsPage';
import { ReceiptField, receiptProblem } from './ReceiptField';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
const uploadToSignedUrl = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));
vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl }) } } }));

const SIGNED = { bucket: 'receipts', path: 'sub-1/abc.jpg', token: 'tok', signed_url: 'https://x' };
const file = (type: string, size = 2048) => new File([new Uint8Array(size)], 'receipt.jpg', { type });
const page = <T,>(items: T[]) => ({ items, total: items.length, page: 1, pageSize: 20 });

function renderPage() {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/subscriptions')) return page([WEEKLY]);
    if (path.endsWith('/receipt')) return { url: 'https://signed/receipt.jpg', expires_at: '2026-10-02T10:00:00Z' };
    return page([PAYMENT]);
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PaymentsPage page={1} onPage={vi.fn()} />
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
    const row = (await screen.findByText('سهيلة')).closest('tr');
    if (!row) throw new Error('row missing');
    expect(within(row).getByText(t.enums.paymentMethod.bank)).toBeTruthy();
    expect(within(row).getByText('مدير')).toBeTruthy();
    fireEvent.click(within(row).getByRole('button', { name: t.payments.viewReceipt }));
    const dialog = await screen.findByRole('dialog', { name: t.payments.receipt });
    expect((await within(dialog).findByRole('img')).getAttribute('src')).toBe('https://signed/receipt.jpg');
    expect(apiFetch).toHaveBeenCalledWith('/payments/pay-1/receipt');
  });

  it('records a payment for a package picked from the unpaid list', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: t.payments.record }));
    const dialog = await screen.findByRole('dialog');
    const picker = within(dialog).getByRole('combobox', { name: t.payments.mobile.chooseSubscription });
    await within(dialog).findByRole('option', { name: /سهيلة/ });
    fireEvent.change(picker, { target: { value: 'sub-1' } });
    expect((within(dialog).getByRole('textbox', { name: new RegExp(t.payments.amount) }) as HTMLInputElement).value).toBe('145');
    apiSend.mockResolvedValue(PAYMENT);
    fireEvent.click(within(dialog).getByRole('button', { name: t.payments.record }));
    await vi.waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/payments', expect.objectContaining({ subscriptionId: 'sub-1', amount: 145 })),
    );
    expect(await screen.findByText(t.payments.saved)).toBeTruthy();
  });
});
