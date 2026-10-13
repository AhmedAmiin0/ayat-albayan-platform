import en from '@ab/shared/i18n/en.json';
import { render, screen, within } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { NotLinkedScreen } from './NotLinkedScreen';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('@/more/sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));

test('an LTR run reads en.json; «Sign out» still scrolls with the body', async () => {
  expect(t).toEqual(en);
  await render(<NotLinkedScreen />);
  expect(screen.getByRole('header', { name: en.teacherDash.title })).toBeTruthy();
  const body = screen.getByTestId('screen-scroll');
  expect(within(body).getByText(en.teacherDash.notLinked)).toBeTruthy();
  expect(within(body).getByRole('button', { name: en.auth.logout })).toBeTruthy();
});
