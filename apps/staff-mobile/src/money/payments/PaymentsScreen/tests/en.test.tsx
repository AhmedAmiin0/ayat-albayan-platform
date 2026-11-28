import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { payment } from '@/payments/fixtures';
import { renderWithQuery } from '@/test/query';
import { PaymentsScreen } from '@/money/payments/PaymentsScreen/PaymentsScreen';
import { mockCall } from '@ab/testing/mock-call';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

test('an English run reads en.json: title, count, chips, method, attachments button', async () => {
  expect(t).toEqual(en);
  mockApi.onRead(() => ({
    items: [payment({ receipt_path: 'a/b.jpg' })],
    total: 1,
    page: 1,
    pageSize: 25,
    totals: [{ currency: 'SAR', net: 145, payments: 145, refunds: 0 }],
  }));
  await renderWithQuery(<PaymentsScreen />);
  // The total on the title's line, no separate count line.
  expect(await screen.findByRole('header', { name: 'All payments · 1' })).toBeTruthy();
  expect(screen.queryByText('1 entries')).toBeNull();
  expect(screen.getByRole('tab', { name: 'All months' })).toBeTruthy();
  expect(screen.getByText(/Bank transfer|bank/i)).toBeTruthy();
  expect(screen.getByRole('button', { name: /View attachments/ })).toBeTruthy();
});
