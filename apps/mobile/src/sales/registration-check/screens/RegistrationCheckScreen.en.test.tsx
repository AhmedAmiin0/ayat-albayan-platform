import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { RegistrationCheckScreen } from './RegistrationCheckScreen';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async (path: string) =>
    path === '/auth/me'
      ? { role: 'sales', permissions: ['students.check_registration'] }
      : { found: false, matches: [], more: false },
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

test('an English run: the registration check reads en.json', async () => {
  expect(t).toEqual(en);
  await renderWithQuery(<RegistrationCheckScreen />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByRole('header', { name: en.registrationCheck.title })).toBeTruthy();
  // The form waits for /auth/me (D6) while the header is already up: wait for it, as the Arabic tests do.
  expect(await screen.findByRole('radio', { name: en.registrationCheck.byName, checked: true })).toBeTruthy();
  expect(screen.getByText(en.registrationCheck.queryHint)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(en.registrationCheck.query), 'Yusuf');
  await fireEvent.press(screen.getByRole('button', { name: en.registrationCheck.submit }));
  expect(await screen.findByText(en.registrationCheck.notFoundName)).toBeTruthy();
});
