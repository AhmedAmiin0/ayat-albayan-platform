import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { SalesTransferScreen } from './SalesTransferScreen';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('@/lib/api', () => {
  const f = jest.requireActual('./fixtures');
  return { ...jest.requireActual('@/lib/api'), apiFetch: async () => f.familyOf(f.kid({ open: [f.openSub()] })) };
});
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966501112223' }),
}));
jest.mock('expo-image-picker', () => ({}));

test('an English run: the transfer screen reads en.json', async () => {
  expect(t).toEqual(en);
  await renderWithQuery(<SalesTransferScreen />);
  expect(await screen.findByRole('header', { name: en.salesMoney.stepTransfer })).toBeTruthy();
  expect(await screen.findByRole('button', { name: en.salesMoney.receiptFromChat })).toBeTruthy();
  expect(screen.getByRole('button', { name: en.salesMoney.receiptCamera })).toBeTruthy();
  expect(screen.getByRole('button', { name: en.salesMoney.saveTransfer })).toBeTruthy();
  expect(screen.getByLabelText(en.salesMoney.note)).toBeTruthy();
});
