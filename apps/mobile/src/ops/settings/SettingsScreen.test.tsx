import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { settings } from '../shared/fixtures';
import { SettingsScreen } from './SettingsScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (p: string) => (p === '/auth/me' ? { role: 'admin', permissions: ['settings.read'] } : settings));
});

test('«الإعدادات» lists «القيم» and «التواصل»; each opens its screen', async () => {
  await renderWithQuery(<SettingsScreen />, createTestQueryClient({ meFromApi: true }));
  expect(screen.getByRole('header', { name: t.settingsHub.title })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobileValues.title }));
  expect(router.push).toHaveBeenCalledWith('/more/ops/settings/values');
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(t.settingsPages.communications) }));
  expect(router.push).toHaveBeenCalledWith('/more/ops/settings/communications');
});

const sendLine = (state: string) => t.settingsPages.sendingState.replace('{state}', state);

test('the send state is on the list: «إرسال الرسائل: مفعّل» with a filled nuqta', async () => {
  await renderWithQuery(<SettingsScreen />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByText(sendLine(t.numbers.chips.enabled))).toBeTruthy();
  expect(screen.getByTestId('nuqta-fill', { includeHiddenElements: true })).toBeTruthy();
});

test('sending off: «إرسال الرسائل: متوقف» with the struck nuqta', async () => {
  mockApiFetch.mockImplementation(async (p: string) =>
    p === '/auth/me' ? { role: 'admin', permissions: ['settings.read'] } : { ...settings, messaging_enabled: false },
  );
  await renderWithQuery(<SettingsScreen />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByText(sendLine(t.numbers.chips.disabled))).toBeTruthy();
  expect(screen.getByTestId('nuqta-struck', { includeHiddenElements: true })).toBeTruthy();
});

test('«التكاملات» is a line, not a button, with «تُدار من الموقع»', async () => {
  await renderWithQuery(<SettingsScreen />, createTestQueryClient({ meFromApi: true }));
  expect(screen.getByText(t.mobileValues.integrations)).toBeTruthy();
  expect(screen.getByText(t.mobileValues.integrationsNote)).toBeTruthy();
  expect(screen.queryByRole('button', { name: new RegExp(t.mobileValues.integrations) })).toBeNull();
});

test('an admin with settings.read gets «مزامنة Google»', async () => {
  await renderWithQuery(<SettingsScreen />, createTestQueryClient({ meFromApi: true }));
  await fireEvent.press(await screen.findByRole('button', { name: t.googleSync.mobile.title }));
  expect(router.push).toHaveBeenCalledWith('/more/ops/settings/google');
});

test('without settings.read: no «مزامنة Google» row', async () => {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/auth/me' ? { role: 'admin', permissions: [] } : settings));
  await renderWithQuery(<SettingsScreen />, createTestQueryClient({ meFromApi: true }));
  await screen.findByText(sendLine(t.numbers.chips.enabled));
  expect(screen.queryByRole('button', { name: t.googleSync.mobile.title })).toBeNull();
});

test('«الردود السريعة» shows only with saved_replies.manage and opens the shared list', async () => {
  await renderWithQuery(<SettingsScreen />, createTestQueryClient({ meFromApi: true }));
  await screen.findByRole('button', { name: t.mobileValues.title });
  expect(screen.queryByRole('button', { name: t.savedReplies.title })).toBeNull();
  mockApiFetch.mockImplementation(async (p: string) =>
    p === '/auth/me' ? { role: 'admin', permissions: ['settings.read', 'saved_replies.manage'] } : settings,
  );
  await renderWithQuery(<SettingsScreen />, createTestQueryClient({ meFromApi: true }));
  await fireEvent.press(await screen.findByRole('button', { name: t.savedReplies.title }));
  expect(router.push).toHaveBeenCalledWith('/more/ops/settings/saved-replies');
});
