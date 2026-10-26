import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { googleLive } from '../google-sync/google-status.fixtures';
import { GoogleSyncScreen } from '../google-sync/GoogleSyncScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
}));

const answer = (permissions: string[]) => (path: string) =>
  Promise.resolve(path === '/auth/me' ? { role: 'admin', permissions } : googleLive);

beforeEach(() => jest.clearAllMocks());

test('«مزامنة Google» with settings.read shows the read-only card, unchanged', async () => {
  mockApiFetch.mockImplementation(answer(['settings.read']));
  await renderWithQuery(<GoogleSyncScreen />, createTestQueryClient({ meFromApi: true }));
  // The card waits for /auth/me, then its status: give a loaded runner time.
  expect(await screen.findByText(t.googleSync.connection.status.connected, {}, { timeout: 5000 })).toBeTruthy();
  expect(screen.getAllByRole('header', { name: t.googleSync.mobile.title }).length).toBeGreaterThan(0);
});

test('without settings.read: no card and no Google request', async () => {
  mockApiFetch.mockImplementation(answer(['lessons.read']));
  await renderWithQuery(<GoogleSyncScreen />, createTestQueryClient({ meFromApi: true }));
  await screen.findByRole('header', { name: t.googleSync.mobile.title });
  expect(screen.queryByText(t.googleSync.connection.status.connected)).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalledWith('/admin/google/status');
});
