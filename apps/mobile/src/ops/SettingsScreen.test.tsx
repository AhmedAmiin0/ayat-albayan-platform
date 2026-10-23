import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { settings } from './fixtures';
import { SettingsScreen } from './SettingsScreen';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
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
  await renderWithQuery(<SettingsScreen />);
  expect(screen.getByRole('header', { name: t.settingsHub.title })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobileValues.title }));
  expect(router.push).toHaveBeenCalledWith('/more/ops/settings/values');
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(t.settingsPages.communications) }));
  expect(router.push).toHaveBeenCalledWith('/more/ops/settings/communications');
});

test('the send state is on the list: «إرسال الرسائل عبر واتساب: مفعّل»', async () => {
  await renderWithQuery(<SettingsScreen />);
  const m = t.mobileAdmin.settings;
  expect(await screen.findByText(`${m.messagingEnabled}: ${m.on}`)).toBeTruthy();
});

test('«التكاملات» is a line, not a button, with «تُدار من الموقع»', async () => {
  await renderWithQuery(<SettingsScreen />);
  expect(screen.getByText(t.mobileValues.integrations)).toBeTruthy();
  expect(screen.getByText(t.mobileValues.integrationsNote)).toBeTruthy();
  expect(screen.queryByRole('button', { name: new RegExp(t.mobileValues.integrations) })).toBeNull();
});

test('an admin with settings.read gets «مزامنة Google»', async () => {
  await renderWithQuery(<SettingsScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.googleSync.mobile.title }));
  expect(router.push).toHaveBeenCalledWith('/more/ops/settings/google');
});

test('without settings.read: no «مزامنة Google» row', async () => {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/auth/me' ? { role: 'admin', permissions: [] } : settings));
  await renderWithQuery(<SettingsScreen />);
  await screen.findByText(new RegExp(t.mobileAdmin.settings.messagingEnabled));
  expect(screen.queryByRole('button', { name: t.googleSync.mobile.title })).toBeNull();
});
