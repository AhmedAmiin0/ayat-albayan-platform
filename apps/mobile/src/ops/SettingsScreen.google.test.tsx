import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { settings } from './fixtures';
import { googleLive } from './google-status.fixtures';
import { SettingsScreen } from './SettingsScreen';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
}));

const answer = (permissions: string[]) => (path: string) =>
  Promise.resolve(
    path === '/auth/me' ? { role: 'admin', permissions } : path === '/settings' ? settings : googleLive,
  );

beforeEach(() => jest.clearAllMocks());

test('with settings.read the Google sync card shows under the read-only settings', async () => {
  mockApiFetch.mockImplementation(answer(['settings.read']));
  await renderWithQuery(<SettingsScreen />);
  expect(await screen.findByText(t.googleSync.connection.status.connected)).toBeTruthy();
  expect(screen.getByRole('header', { name: t.googleSync.mobile.title })).toBeTruthy();
});

test('without settings.read: no card and no Google request', async () => {
  mockApiFetch.mockImplementation(answer(['lessons.read']));
  await renderWithQuery(<SettingsScreen />);
  expect(await screen.findByText(t.mobileAdmin.settings.readOnlyTitle)).toBeTruthy();
  expect(screen.queryByText(t.googleSync.mobile.title)).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalledWith('/admin/google/status');
});
