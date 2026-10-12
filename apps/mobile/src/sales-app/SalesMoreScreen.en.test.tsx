import en from '@ab/shared/i18n/en.json';
import { render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { SalesMoreScreen } from './SalesMoreScreen';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

test('the sales «More» reads en.json', async () => {
  expect(t).toEqual(en);
  await render(<SalesMoreScreen can={() => true} />);
  expect(screen.getByRole('header', { name: en.mobile.more })).toBeTruthy();
  expect(screen.getByText(en.mobileRoles.salesRole)).toBeTruthy();
  expect(screen.getByRole('button', { name: en.sales.nav.teachers })).toBeTruthy();
  expect(screen.getByRole('button', { name: en.assistantPortal.nav.earnings })).toBeTruthy();
  expect(screen.getByRole('button', { name: en.auth.logout })).toBeTruthy();
});
