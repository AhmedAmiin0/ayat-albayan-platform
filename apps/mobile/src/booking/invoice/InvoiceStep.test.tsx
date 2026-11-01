import { RECEIPT_MAX_BYTES } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { pickReceipt } from '@/core/lib/receipts/receipt';
import { renderWithQuery } from '@/test/query';
import { UPLOADED } from '@/booking/testing/fixtures';
import { uploadInvoice } from './invoice-upload';
import { InvoiceStep, type InvoiceStepProps } from './InvoiceStep';
import { PHOTO, PREVIEW } from '@/booking/testing/test-utils';

jest.mock('@/core/lib/receipts/receipt', () => ({ pickReceipt: jest.fn() }));
jest.mock('./invoice-upload', () => ({ uploadInvoice: jest.fn() }));
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const REQ = '99999999-9999-4999-8999-999999999999';
const PHONE = '+966552147730';
const MEDIA = '/threads/%2B966552147730/media';
const pick = jest.mocked(pickReceipt);
const upload = jest.mocked(uploadInvoice);
const m = t.booking.mobile;

const step = async (over: Partial<InvoiceStepProps> = {}) => {
  const props = { requestId: REQ, value: null, onChange: jest.fn(), onNext: jest.fn(), ...over };
  return { props, ...(await renderWithQuery(<InvoiceStep {...props} />)) };
};
const press = async (name: string) => fireEvent.press(await screen.findByRole('button', { name }));

beforeEach(() => {
  jest.clearAllMocks();
  pick.mockResolvedValue(PHOTO);
  upload.mockResolvedValue('req/0b1c.jpg');
});

test('«الفاتورة *» is required: «التالي» says so and does not move on', async () => {
  const { props } = await step();
  expect(screen.getByText(`${t.booking.invoice.label} *`)).toBeTruthy();
  expect(screen.getByText(t.booking.invoice.hint)).toBeTruthy();
  await press(t.booking.next);
  expect(await screen.findByText(t.booking.error.invoice_required)).toBeTruthy();
  expect(props.onNext).not.toHaveBeenCalled();
});

test('camera or gallery: the photo uploads at once under the wizard’s request id, and goes on', async () => {
  const { props } = await step();
  await press(m.takePhoto);
  expect(pick).toHaveBeenCalledWith('camera');
  expect(upload).toHaveBeenCalledWith(REQ, PHOTO);
  expect(props.onChange).toHaveBeenCalledWith({
    source: 'upload',
    path: 'req/0b1c.jpg',
    mime: 'image/jpeg',
    uri: PHOTO.uri,
  });
  await press(t.payments.mobile.pickPhoto);
  expect(pick).toHaveBeenLastCalledWith('library');
});

test('a picked invoice shows, can be retaken or removed, and lets «التالي» through', async () => {
  const { props } = await step({ value: UPLOADED });
  expect(screen.getByLabelText(PREVIEW)).toBeTruthy();
  await press(t.payments.mobile.retake);
  expect(pick).toHaveBeenCalledWith('camera');
  await press(t.booking.invoice.remove);
  expect(props.onChange).toHaveBeenLastCalledWith(null);
  await press(t.booking.next);
  expect(props.onNext).toHaveBeenCalledTimes(1);
});

test('offline: the photo is kept and «أعد الرفع» retries the same bytes, no second pick', async () => {
  upload.mockRejectedValueOnce(new TypeError('Network request failed'));
  const { props } = await step();
  await press(m.takePhoto);
  expect(await screen.findByText(m.invoiceOffline)).toBeTruthy();
  expect(screen.getByLabelText(PREVIEW)).toBeTruthy();
  expect(props.onChange).not.toHaveBeenCalled();
  await press(m.retryUpload);
  expect(upload).toHaveBeenCalledTimes(2);
  expect(upload).toHaveBeenLastCalledWith(REQ, PHOTO);
  expect(pick).toHaveBeenCalledTimes(1);
  expect(props.onChange).toHaveBeenCalledWith(expect.objectContaining({ path: 'req/0b1c.jpg' }));
  expect(screen.queryByText(m.invoiceOffline)).toBeNull();
});

test('Storage refusing the file says so; a photo over 10 MB never uploads', async () => {
  upload.mockRejectedValueOnce(new Error('mime'));
  await step();
  await press(m.takePhoto);
  expect(await screen.findByText(m.invoiceUploadFailed)).toBeTruthy();
  pick.mockResolvedValueOnce({ ...PHOTO, size: RECEIPT_MAX_BYTES + 1 });
  await press(t.payments.mobile.pickPhoto);
  expect(await screen.findByText(t.booking.error.invoice_too_large)).toBeTruthy();
  expect(upload).toHaveBeenCalledTimes(1);
});

test('no chat number: no «من المحادثة»', async () => {
  await step();
  expect(screen.queryByRole('button', { name: t.booking.invoice.fromChat })).toBeNull();
});

test('with the guardian’s number: her files are listed and one is picked, nothing uploaded', async () => {
  mockApiFetch.mockImplementation((path: string) =>
    Promise.resolve(
      path === MEDIA
        ? [{ message_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', created_at: '2026-10-02T10:00:00.000Z', mime: 'application/pdf', caption: 'تحويل', expired: false }]
        : null,
    ),
  );
  const { props } = await step({ chatPhone: PHONE });
  await press(t.booking.invoice.fromChat);
  await fireEvent.press(await screen.findByText('تحويل'));
  expect(mockApiFetch).toHaveBeenCalledWith(MEDIA);
  expect(props.onChange).toHaveBeenCalledWith({
    source: 'whatsapp',
    messageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    mime: 'application/pdf',
    uri: null,
  });
  expect(upload).not.toHaveBeenCalled();
});
