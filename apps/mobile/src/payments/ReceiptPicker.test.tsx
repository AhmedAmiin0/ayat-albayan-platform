import { RECEIPT_MAX_BYTES } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { pickReceipt, type Receipt } from './receipt';
import { ReceiptPicker } from './ReceiptPicker';

jest.mock('./receipt', () => ({ pickReceipt: jest.fn() }));
const pick = jest.mocked(pickReceipt);
const m = t.payments.mobile;
const photo = (size: number): Receipt => ({
  uri: 'file:///cache/slip.jpg',
  mime: 'image/jpeg',
  bytes: new ArrayBuffer(0),
  size,
});

beforeEach(() => jest.clearAllMocks());

test('the gallery hands its photo to the form', async () => {
  pick.mockResolvedValue(photo(1000));
  const onChange = jest.fn();
  await render(<ReceiptPicker receipt={null} onChange={onChange} />);
  await fireEvent.press(screen.getByRole('button', { name: m.pickPhoto }));
  expect(pick).toHaveBeenCalledWith('library');
  expect(onChange).toHaveBeenCalledWith(photo(1000));
});

test('over the 10 MB bucket limit: refused before any upload', async () => {
  pick.mockResolvedValue(photo(RECEIPT_MAX_BYTES + 1));
  const onChange = jest.fn();
  await render(<ReceiptPicker receipt={null} onChange={onChange} />);
  await fireEvent.press(screen.getByRole('button', { name: m.takePhoto }));
  expect(await screen.findByText(t.payments.error.receipt_too_large)).toBeTruthy();
  expect(onChange).not.toHaveBeenCalled();
});

test('cancelled: nothing changes; a picker failure says so', async () => {
  pick.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('native'));
  const onChange = jest.fn();
  await render(<ReceiptPicker receipt={photo(10)} onChange={onChange} />);
  expect(screen.getByLabelText(t.payments.receipt)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: m.retake }));
  expect(onChange).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: m.retake }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
});
