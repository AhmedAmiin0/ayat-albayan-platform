import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { PROFILE_KEY } from '@/account/hooks/queries';
import { t } from '@/core/lib/i18n/i18n';
import { profileFixture } from '@/test/account';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { SalesMoreScreen } from './SalesMoreScreen';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const seeded = () => {
  const client = createTestQueryClient();
  client.setQueryData(PROFILE_KEY, profileFixture);
  return client;
};

test('the sales «More» reads en.json', async () => {
  expect(t).toEqual(en);
  await renderWithQuery(<SalesMoreScreen can={() => true} />, seeded());
  expect(screen.getByRole('header', { name: en.mobile.more })).toBeTruthy();
  expect(screen.getByText(en.mobileRoles.salesRole)).toBeTruthy();
  expect(screen.getByRole('button', { name: en.sales.nav.teachers })).toBeTruthy();
  expect(screen.getByRole('button', { name: en.assistantPortal.nav.earnings })).toBeTruthy();
  expect(screen.getByRole('button', { name: en.auth.logout })).toBeTruthy();
});
