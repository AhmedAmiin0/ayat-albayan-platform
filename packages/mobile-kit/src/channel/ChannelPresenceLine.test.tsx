import type { ChannelPresence } from '@ab/shared';
import { act, screen, waitFor } from '@testing-library/react-native';
import { t } from '../lib/i18n/i18n';
import { freshQueryClient, renderWithQuery } from '../testing/query';
import { realtime } from '@ab/testing/presence-realtime';
import { ChannelPresenceLine } from './ChannelPresenceLine';

const mockApiFetch = jest.fn();
jest.mock('../lib/http/api', () => ({
  ...jest.requireActual('../lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('../lib/http/supabase', () =>
  jest.requireActual('@ab/testing/presence-realtime').realtime.module(),
);

const p = t.presence;
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const answer = (over: Partial<ChannelPresence> = {}): ChannelPresence => ({
  enabled: true,
  peers: [{ profile_id: 'g1', role: 'guardian', last_seen_at: ago(5) }],
  ...over,
});
const refs = { audience: 'teacher', studentId: 's1' } as const;

beforeEach(() => {
  mockApiFetch.mockReset();
  realtime.reset();
});

test('offline: «آخر ظهور منذ 5 دقائق» under the title, no dot; it reads the presence', async () => {
  mockApiFetch.mockResolvedValue(answer());
  await renderWithQuery(<ChannelPresenceLine refs={refs} />, freshQueryClient());
  const when = p.minutes.few.replace('{n}', '5');
  expect(await screen.findByText(p.lastSeen.replace('{when}', when))).toBeTruthy();
  expect(screen.queryByTestId('presence-dot')).toBeNull();
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/me/channels/s1/presence');
});

test('online on the socket: «متصل الآن» with the dot; gone again: last seen', async () => {
  mockApiFetch.mockResolvedValue(answer());
  await renderWithQuery(<ChannelPresenceLine refs={refs} />, freshQueryClient());
  await waitFor(() => expect(realtime.isOpen('g1')).toBe(true));
  await act(async () => {
    realtime.joinAll();
    realtime.present('g1');
  });
  expect(await screen.findByText(p.online)).toBeTruthy();
  expect(screen.getByTestId('presence-dot')).toBeTruthy();
  await act(async () => realtime.present('g1', false));
  expect(screen.queryByText(p.online)).toBeNull();
  expect(screen.queryByTestId('presence-dot')).toBeNull();
});

test('presence off: nothing shown and nobody watched', async () => {
  mockApiFetch.mockResolvedValue(answer({ enabled: false, peers: [] }));
  await renderWithQuery(<ChannelPresenceLine refs={refs} />, freshQueryClient());
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
  expect(screen.queryByTestId('channel-presence')).toBeNull();
  expect(realtime.topics()).toEqual([]);
});

test('nobody to show: nothing', async () => {
  mockApiFetch.mockResolvedValue(answer({ peers: [] }));
  await renderWithQuery(<ChannelPresenceLine refs={refs} />, freshQueryClient());
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
  expect(screen.queryByTestId('channel-presence')).toBeNull();
});

test('never seen and offline: nothing', async () => {
  const peers = [{ profile_id: 'g1', role: 'guardian', last_seen_at: null }] as const;
  mockApiFetch.mockResolvedValue(answer({ peers: [...peers] }));
  await renderWithQuery(<ChannelPresenceLine refs={refs} />, freshQueryClient());
  await waitFor(() => expect(realtime.isOpen('g1')).toBe(true));
  expect(screen.queryByTestId('channel-presence')).toBeNull();
});
