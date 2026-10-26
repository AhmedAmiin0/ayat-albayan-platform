import en from '@ab/shared/i18n/en.json';
import { render, screen } from '@testing-library/react-native';
import { MoreScreen } from './screens/MoreScreen';

// An English run: the native flag is LTR.
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

test('English: a payments-only role sees «Money» rows it holds and no admin section', async () => {
  await render(<MoreScreen can={(p) => p === 'payments.read'} />);
  expect(screen.getByRole('header', { name: en.mobileMoney.section })).toBeTruthy();
  expect(screen.getByRole('button', { name: en.mobileMoney.paymentsTitle })).toBeTruthy();
  expect(screen.queryByRole('button', { name: en.mobileMoney.receivablesTitle })).toBeNull();
  expect(screen.queryByRole('header', { name: en.mobileAdmin.section })).toBeNull();
});
