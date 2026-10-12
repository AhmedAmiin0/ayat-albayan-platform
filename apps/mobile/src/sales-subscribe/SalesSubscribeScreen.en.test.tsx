import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { familyOf, kid, salesQuote } from './fixtures';
import { SalesSubscribeScreen } from './SalesSubscribeScreen';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: async () => jest.requireActual('./fixtures').familyOf(jest.requireActual('./fixtures').kid()),
  apiSend: async () => jest.requireActual('./fixtures').salesQuote,
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
  expect(await screen.findByRole('button', { name: en.salesMoney.saveSubscription, disabled: false })).toBeTruthy();
  expect(screen.getByText(en.salesMoney.price)).toBeTruthy();
  expect(screen.getByText(en.salesMoney.priceHint)).toBeTruthy();
});
