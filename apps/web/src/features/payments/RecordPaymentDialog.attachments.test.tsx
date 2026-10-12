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

const posts = () => apiSend.mock.calls.filter(([, path]) => path === '/payments').map((c) => c[2] as Record<string, unknown>);
const img = (name: string) => new File([new Uint8Array(16)], name, { type: 'image/jpeg' });

function open() {
  apiFetch.mockResolvedValue({});
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RecordPaymentDialog subscription={WEEKLY} onClose={vi.fn()} onSaved={vi.fn()} />
    </QueryClientProvider>,
  );
  const dialog = within(screen.getByRole('dialog'));
  const method = (m: string) => fireEvent.change(dialog.getByRole('combobox', { name: t.payments.method }), { target: { value: m } });
  const add = (files: File[]) => fireEvent.change(dialog.getByLabelText(t.payments.attachmentsAdd), { target: { files } });
  const save = () => fireEvent.click(dialog.getByRole('button', { name: t.payments.record }));
  return { dialog, method, add, save };
}

describe('RecordPaymentDialog «المرفقات» (bank only)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    uploadToSignedUrl.mockReset();
    uploadToSignedUrl.mockResolvedValue({ data: {}, error: null });
  });

  it('shown only for a bank payment; switching away clears them, nothing is sent', async () => {
    const { dialog, method, add, save } = open();
    expect(dialog.getByText(t.payments.attachments)).toBeTruthy();
    add([img('a.jpg')]);
    expect(dialog.getByText('a.jpg')).toBeTruthy();
    method('cash');
    expect(dialog.queryByText(t.payments.attachments)).toBeNull();
    method('bank');
    expect(dialog.queryByText('a.jpg')).toBeNull();
    method('cash');
    apiSend.mockResolvedValue(PAYMENT);
    save();
    await vi.waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]).toMatchObject({ method: 'cash', receiptPath: null });
    expect(posts()[0]).not.toHaveProperty('attachments');
    expect(uploadToSignedUrl).not.toHaveBeenCalled();
  });

  it('two attachments: each uploaded through the admin signed URL, both paths posted beside the receipt', async () => {
    let n = 0;
    apiSend.mockImplementation(async (_m: string, path: string) =>
      path === '/payments/receipt-upload-url' ? { bucket: 'receipts', path: `sub-1/${(n += 1)}.jpg`, token: 'tok', signed_url: 'x' } : PAYMENT,
    );
    const { dialog, add, save } = open();
    add([img('a.jpg'), img('b.jpg')]);
    expect(dialog.getByText(t.payments.attachmentN.replace('{n}', '2'))).toBeTruthy();
    expect(dialog.getByLabelText(t.payments.addReceipt)).toBeTruthy();
    save();
    await vi.waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]).toMatchObject({ method: 'bank', receiptPath: null, attachments: ['sub-1/1.jpg', 'sub-1/2.jpg'] });
    expect(apiSend).toHaveBeenCalledWith('POST', '/payments/receipt-upload-url', { subscriptionId: 'sub-1', mime: 'image/jpeg', size: 16 });
  });

  it('five at most: the picker gives way to the limit line', () => {
    const { dialog, add } = open();
    add(['1', '2', '3', '4', '5', '6'].map((x) => img(`${x}.jpg`)));
    expect(dialog.getAllByText(t.payments.error.too_many_attachments).length).toBeGreaterThan(0);
    expect(dialog.queryByLabelText(t.payments.attachmentsAdd)).toBeNull();
    expect(dialog.queryByText('6.jpg')).toBeNull();
  });
});
