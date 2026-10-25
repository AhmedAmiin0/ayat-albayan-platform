import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { googleDryRunError, googleLive } from './google-status.fixtures';
import { GoogleSyncCard } from './GoogleSyncCard';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));

const g = t.googleSync;
const fill = (s: string, pairs: Record<string, string>) =>
  Object.entries(pairs).reduce((acc, [k, v]) => acc.replace(`{${k}}`, v), s);

beforeEach(() => jest.clearAllMocks());

test('loading: a spinner and the web-only note, no buttons', async () => {
  mockApiFetch.mockReturnValue(new Promise(() => undefined));
  await renderWithQuery(<GoogleSyncCard />);
  expect(screen.getByLabelText(t.common.loading)).toBeTruthy();
  expect(screen.getByText(g.mobile.webOnly)).toBeTruthy();
  expect(screen.queryAllByRole('button')).toHaveLength(0);
  expect(mockApiFetch).toHaveBeenCalledWith('/admin/google/status');
});

test('error: the load error and a retry that refetches', async () => {
  mockApiFetch.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(googleLive);
  await renderWithQuery(<GoogleSyncCard />);
  expect(await screen.findByText(g.mobile.loadError)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  await waitFor(() => expect(screen.getByText(g.connection.status.connected)).toBeTruthy());
  expect(mockApiFetch).toHaveBeenCalledTimes(2);
});

test('connected, live: account, sync on, live mode, counts, no errors; read-only', async () => {
  mockApiFetch.mockResolvedValue(googleLive);
  await renderWithQuery(<GoogleSyncCard />);
  expect(await screen.findByText(g.connection.status.connected)).toBeTruthy();
  expect(screen.getByText(fill(g.connection.email, { email: 'academy@example.com' }))).toBeTruthy();
  expect(screen.getByText(fill(g.mobile.sync, { state: g.switches.on }))).toBeTruthy();
  expect(screen.getByText(fill(g.mobile.mode, { mode: g.switches.live }))).toBeTruthy();
  expect(screen.getByText(fill(g.mobile.counts, { pending: '2', failed: '1' }))).toBeTruthy();
  expect(screen.getByText(g.mobile.noError)).toBeTruthy();
  expect(screen.getByTestId('chip-ok')).toBeTruthy();
  expect(screen.queryAllByRole('button')).toHaveLength(0);
});

test('disconnected, dry run: no account line, sync off, the last error', async () => {
  mockApiFetch.mockResolvedValue(googleDryRunError);
  await renderWithQuery(<GoogleSyncCard />);
  expect(await screen.findByText(g.connection.status.disconnected)).toBeTruthy();
  expect(screen.queryByText(fill(g.connection.email, { email: 'academy@example.com' }))).toBeNull();
  expect(screen.getByText(fill(g.mobile.sync, { state: g.switches.off }))).toBeTruthy();
  expect(screen.getByText(fill(g.mobile.mode, { mode: g.switches.dryRun }))).toBeTruthy();
  expect(screen.getByText(fill(g.mobile.counts, { pending: '0', failed: '4' }))).toBeTruthy();
  expect(screen.getByText(fill(g.mobile.lastError, { error: g.errors.invalid_grant }))).toBeTruthy();
  expect(screen.getByTestId('chip-neutral')).toBeTruthy();
});
