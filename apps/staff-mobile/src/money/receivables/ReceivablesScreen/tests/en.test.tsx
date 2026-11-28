import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t, money } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { receivable, receivablesView } from '@/money/shared/fixtures';
import { ReceivablesScreen } from '@/money/receivables/ReceivablesScreen/ReceivablesScreen';
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

test('an English run reads en.json: title, count, days late, English currency', async () => {
  expect(t).toEqual(en);
  mockApi.onRead(() => receivablesView([receivable()]));
  await renderWithQuery(<ReceivablesScreen />);
  // The total on the title's line, no separate count line.
  expect(
    await screen.findByRole('header', { name: `${en.mobileMoney.receivablesTitle} · 1` }),
  ).toBeTruthy();
  expect(screen.queryByText('1 unpaid packages')).toBeNull();
  expect(screen.getByText('34 days ago')).toBeTruthy();
  expect(screen.getAllByText(money(100, 'SAR')).length).toBeGreaterThan(0);
});
