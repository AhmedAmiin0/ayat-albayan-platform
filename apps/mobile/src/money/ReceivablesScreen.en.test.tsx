import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { money } from '@/payments/format';
import { renderWithQuery } from '@/test/query';
import { receivable, receivablesView } from './fixtures';
import { ReceivablesScreen } from './ReceivablesScreen';

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

test('an English run reads en.json: title, count, days late, English currency', async () => {
  expect(t).toEqual(en);
  mockApiFetch.mockResolvedValue(receivablesView([receivable()]));
  await renderWithQuery(<ReceivablesScreen />);
  expect(await screen.findByRole('header', { name: en.mobileMoney.receivablesTitle })).toBeTruthy();
  expect(await screen.findByText('1 unpaid packages')).toBeTruthy();
  expect(screen.getByText('34 days ago')).toBeTruthy();
  expect(screen.getAllByText(money(100, 'SAR')).length).toBeGreaterThan(0);
});
