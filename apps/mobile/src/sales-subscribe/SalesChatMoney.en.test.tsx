import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { familyOf, familyThread, kid, openSub } from './fixtures';
import { SalesChatMoney } from './SalesChatMoney';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

test('an English run reads en.json for both chat buttons', async () => {
  expect(t).toEqual(en);
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/auth/me' ? { permissions: ['self.sales', 'self.sales_money'] } : familyOf(kid({ open: [openSub()] })),
  );
  await renderWithQuery(<SalesChatMoney thread={familyThread} />);
  expect(await screen.findByRole('button', { name: en.salesMoney.newSubscription })).toBeTruthy();
  expect(screen.getByRole('button', { name: en.salesMoney.recordTransfer })).toBeTruthy();
});
