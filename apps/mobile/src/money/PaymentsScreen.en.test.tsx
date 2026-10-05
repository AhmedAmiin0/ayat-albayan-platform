import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { payment } from '@/payments/fixtures';
import { renderWithQuery } from '@/test/query';
import { PaymentsScreen } from './PaymentsScreen';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

test('an English run reads en.json: title, count, chips, method, receipt button', async () => {
  expect(t).toBe(en);
  mockApiFetch.mockResolvedValue({
    items: [payment({ receipt_path: 'a/b.jpg' })],
    total: 1,
    page: 1,
    pageSize: 25,
    totals: [{ currency: 'SAR', net: 145, payments: 145, refunds: 0 }],
  });
  await renderWithQuery(<PaymentsScreen />);
  expect(await screen.findByRole('header', { name: 'All payments' })).toBeTruthy();
  expect(await screen.findByText('1 entries')).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'All months' })).toBeTruthy();
  expect(screen.getByText(/Bank transfer|bank/i)).toBeTruthy();
  expect(screen.getByRole('button', { name: /View receipt/ })).toBeTruthy();
});
