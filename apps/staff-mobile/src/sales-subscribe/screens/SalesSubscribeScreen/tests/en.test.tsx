import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { familyOf, kid, salesQuote } from '@/sales-subscribe/testing/fixtures';
import { SalesSubscribeScreen } from '@/sales-subscribe/screens/SalesSubscribeScreen/SalesSubscribeScreen';
import { mockCall } from '@ab/testing/mock-call';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApi = mockCall();
mockApi.onRead(async () =>
  jest
    .requireActual('@/sales-subscribe/testing/fixtures')
    .familyOf(jest.requireActual('@/sales-subscribe/testing/fixtures').kid()),
);
mockApi.onWrite(async () => jest.requireActual('@/sales-subscribe/testing/fixtures').salesQuote);
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966501112223' }),
}));

test('an English run: the sales subscribe screen reads en.json', async () => {
  expect(t).toEqual(en);
  expect(familyOf(kid()).students).toHaveLength(1);
  expect(salesQuote.currency).toBe('SAR');
  await renderWithQuery(<SalesSubscribeScreen />);
  expect(await screen.findByRole('header', { name: en.salesMoney.newSubscription })).toBeTruthy();
  expect(
    await screen.findByRole('button', { name: en.salesMoney.saveSubscription, disabled: false }),
  ).toBeTruthy();
  expect(screen.getByText(en.salesMoney.price)).toBeTruthy();
  expect(screen.getByText(en.salesMoney.priceHint)).toBeTruthy();
});
