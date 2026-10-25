import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { catalogue as mockCatalogue, settings as mockSettings } from '../shared/fixtures';
import { numbersAnswer as mockNumbersAnswer } from '../numbers/numbers-fixtures';
import { CommunicationsScreen } from './CommunicationsScreen';
import { SettingsScreen } from './SettingsScreen';
import { ValuesScreen } from '../values/ValuesScreen';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async (p: string) => mockNumbersAnswer(p) ?? (p === '/admin/notifications' ? mockCatalogue : mockSettings),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true, push: jest.fn() } }));

test('English: the list comes from en.json', async () => {
  expect(t).toEqual(en);
  await renderWithQuery(<SettingsScreen />);
  expect(screen.getByRole('header', { name: en.settingsHub.title })).toBeTruthy();
  expect(screen.getByRole('button', { name: en.mobileValues.title })).toBeTruthy();
  expect(screen.getByText(en.mobileValues.integrationsNote)).toBeTruthy();
});

test('English: «Values» table and sheet', async () => {
  await renderWithQuery(<ValuesScreen />);
  expect(await screen.findByText(en.settings.bookingHorizonWeeks)).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: new RegExp(en.settings.sections.accounts) }));
  await fireEvent.press(await screen.findByRole('button', { name: new RegExp(en.settings.reportingCurrency) }));
  expect(screen.getByRole('radio', { name: 'SAR' })).toBeTruthy();
  expect(screen.getByRole('button', { name: en.config.custom.save })).toBeTruthy();
});

test('English: «Communications» keeps the read-only send state and the catalogue', async () => {
  await renderWithQuery(<CommunicationsScreen />);
  expect(await screen.findByText(`${en.mobileAdmin.settings.readOnlyNote} ${en.communicationsHub.webOnly}`)).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: en.settingsValues.groups.notifications }));
  expect(await screen.findByText(en.notificationCatalogue.entries.report_ready.name)).toBeTruthy();
});
