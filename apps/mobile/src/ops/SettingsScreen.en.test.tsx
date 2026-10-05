import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { settings as mockSettings } from './fixtures';
import { SettingsScreen } from './SettingsScreen';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: async () => mockSettings,
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true } }));

test('English: the form and the read-only note come from en.json', async () => {
  expect(t).toEqual(en);
  await renderWithQuery(<SettingsScreen />);
  expect(screen.getByRole('header', { name: en.mobileAdmin.settings.title })).toBeTruthy();
  expect(await screen.findByLabelText(en.settings.reportingCurrency)).toBeTruthy();
  expect(screen.getByText(en.mobileAdmin.settings.readOnlyNote)).toBeTruthy();
});
