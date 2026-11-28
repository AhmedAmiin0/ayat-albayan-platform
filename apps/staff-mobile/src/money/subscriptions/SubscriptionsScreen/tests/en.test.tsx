import { SETTING_DEFAULTS } from '@ab/settings';
import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { page, subscription } from '@/payments/fixtures';
import { renderWithQuery } from '@/test/query';
import { SubscriptionsScreen } from '@/money/subscriptions/SubscriptionsScreen/SubscriptionsScreen';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

test('an English run reads en.json: title, view tabs, status chips, renewal flag', async () => {
  expect(t).toEqual(en);
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/settings' ? { ...SETTING_DEFAULTS, renewal_alert_remaining: 2 } : page([subscription({ status: 'active', paid: 145 })]),
  );
  await renderWithQuery(<SubscriptionsScreen />);
  expect(await screen.findByRole('header', { name: en.mobileMoney.subscriptionsTitle })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'Tasks' })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'Partly paid' })).toBeTruthy();
  expect(await screen.findByText(/Needs renewal/)).toBeTruthy();
});
