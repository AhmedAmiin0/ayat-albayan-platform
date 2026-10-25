import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithQuery } from '@/test/query';
import { InvoiceStep } from './InvoiceStep';

jest.mock('@/payments/receipt', () => ({ pickReceipt: jest.fn() }));
jest.mock('./invoice-upload', () => ({ uploadInvoice: jest.fn() }));
// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

test('the invoice step reads in English: required, hint, the buttons and the missing-invoice error', async () => {
  const onNext = jest.fn();
  await renderWithQuery(
    <InvoiceStep requestId="r" chatPhone="+966552147730" value={null} onChange={jest.fn()} onNext={onNext} />,
  );
  expect(screen.getByText('Invoice *')).toBeTruthy();
  expect(screen.getByText('A photo or PDF proving payment. Required before booking')).toBeTruthy();
  for (const name of ['Photograph the invoice', 'From chat']) {
    expect(screen.getByRole('button', { name })).toBeTruthy();
  }
  await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
  expect(await screen.findByText('Upload the invoice or pick it from the chat before booking')).toBeTruthy();
  expect(onNext).not.toHaveBeenCalled();
});
