import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/inbox/test-utils';
import { t } from '@/lib/i18n';
import { PAYMENTS } from './fixtures';
import { PayDialog } from './PayDialog';

const apiSend = vi.hoisted(() => vi.fn());
const uploadToSignedUrl = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiSend }));
vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl }) } } }));

const SIGNED = { bucket: 'receipts', path: 't-1/r.jpg', token: 'tok', signed_url: 'https://x' };
const jpg = () => new File([new Uint8Array(16)], 'r.jpg', { type: 'image/jpeg' });

function open() {
  const onSaved = vi.fn();
  renderWithClient(<PayDialog teacherId="t-1" earningIds={[]} due={70} onClose={vi.fn()} onSaved={onSaved} />);
  const dialog = screen.getByRole('dialog');
  const attach = (file: File) =>
    fireEvent.change(within(dialog).getByLabelText(t.payments.addReceipt), { target: { files: [file] } });
  const submit = () => fireEvent.click(within(dialog).getByRole('button', { name: t.teacherEarnings.submit }));
  return { dialog, attach, submit, onSaved };
}

const paths = () => apiSend.mock.calls.map(([, path]) => path);

afterEach(() => {
  apiSend.mockReset();
  uploadToSignedUrl.mockReset();
});

describe('PayDialog receipt flow', () => {
  it('asks for a signed URL, uploads the file, then sends its path with the payment', async () => {
    apiSend.mockImplementation(async (_m: string, path: string) => (path.endsWith('receipt-upload-url') ? SIGNED : PAYMENTS[0]));
    uploadToSignedUrl.mockResolvedValue({ data: {}, error: null });
    const { attach, submit, onSaved } = open();
    attach(jpg());
    submit();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(apiSend).toHaveBeenCalledWith('POST', '/teachers/t-1/earnings/receipt-upload-url', { mime: 'image/jpeg', size: 16 });
    expect(uploadToSignedUrl).toHaveBeenCalledWith('t-1/r.jpg', 'tok', expect.any(File), { contentType: 'image/jpeg' });
    expect(apiSend).toHaveBeenLastCalledWith('POST', '/teachers/t-1/earnings/payments', expect.objectContaining({ receiptPath: 't-1/r.jpg' }));
  });

  it('a wrong file type is refused before any request', () => {
    const { dialog, attach, submit } = open();
    attach(new File(['x'], 'r.txt', { type: 'text/plain' }));
    submit();
    expect(within(dialog).getByText(t.payments.error.receipt_type)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('a lost reply retries without uploading the same file twice', async () => {
    let posts = 0;
    apiSend.mockImplementation(async (_m: string, path: string) => {
      if (path.endsWith('receipt-upload-url')) return SIGNED;
      if (posts++ === 0) throw new TypeError('Failed to fetch');
      return PAYMENTS[0];
    });
    uploadToSignedUrl.mockResolvedValue({ data: {}, error: null });
    const { dialog, attach, submit, onSaved } = open();
    attach(jpg());
    submit();
    expect(await within(dialog).findByText(t.payments.mobile.offline)).toBeTruthy();
    submit();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(paths().filter((p) => p.endsWith('receipt-upload-url'))).toHaveLength(1);
    expect(uploadToSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('a storage failure says the receipt did not upload', async () => {
    apiSend.mockResolvedValue(SIGNED);
    uploadToSignedUrl.mockResolvedValue({ data: null, error: Object.assign(new Error('x'), { name: 'StorageError' }) });
    const { dialog, attach, submit } = open();
    attach(jpg());
    submit();
    expect(await within(dialog).findByText(t.payments.mobile.uploadFailed)).toBeTruthy();
  });
});
