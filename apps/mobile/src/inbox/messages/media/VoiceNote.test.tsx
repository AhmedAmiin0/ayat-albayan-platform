import { act, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { LOAD_MS } from './VoicePlayback';
import { pathOf, players, resetPlayers, showVoice, signed, statusIs, tapPlay, voiceNote } from './voice-test-kit';

// The ring and the unloaded waveform are hidden from screen readers (their button speaks): still queried.
const ALL = { includeHiddenElements: true };
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const serve = (answer: () => Promise<unknown>) =>
  mockApiFetch.mockImplementation((path: string) => (path === pathOf('v1') ? answer() : Promise.resolve(null)));
const file = async () => ({ url: signed('v1'), mime: 'audio/ogg', expires_at: '2099-01-01T00:00:00Z' });
const fetches = () => mockApiFetch.mock.calls.filter(([p]) => p === pathOf('v1')).length;

beforeEach(async () => {
  mockApiFetch.mockReset();
  resetPlayers();
  await statusIs({});
});

test('the row shows before any request: round play button and waveform, nothing signed (W6)', async () => {
  await showVoice();
  expect(screen.getByTestId('voice-wave', ALL)).toBeTruthy();
  expect(screen.queryByTestId('media-spinner', ALL)).toBeNull();
  expect(fetches()).toBe(0);
  expect(screen.getByText(t.inbox.download.action)).toBeTruthy();
});

test('ONE tap fetches once, shows the ring while fetching, and plays as soon as it is loaded', async () => {
  let answer: (v: unknown) => void = () => undefined;
  serve(() => new Promise((resolve) => (answer = resolve)));
  await statusIs({ isLoaded: false });
  const view = await showVoice();
  await tapPlay();
  await tapPlay();
  expect(fetches()).toBe(1);
  expect(screen.getByTestId('media-spinner', ALL)).toBeTruthy();
  answer(await file());
  await waitFor(() => expect(players.get(signed('v1'))).toBeTruthy());
  const player = players.get(signed('v1'));
  // Not loaded yet: the ring stays and nothing plays.
  expect(player?.play).not.toHaveBeenCalled();
  expect(screen.getByTestId('media-spinner', ALL)).toBeTruthy();
  await statusIs({ isLoaded: true, playing: true });
  await view.rerender(voiceNote());
  await waitFor(() => expect(player?.play).toHaveBeenCalledTimes(1));
  expect(screen.queryByTestId('media-spinner', ALL)).toBeNull();
  expect(fetches()).toBe(1);
});

test.each([
  [410, 'media_expired', () => t.inbox.mediaExpired],
  [409, 'crm_no_media', () => t.inbox.mediaInCrm],
])('%i %s: the bubble says so in place of the player', async (status, code, text) => {
  serve(async () => {
    throw new ApiError(status, { code });
  });
  await showVoice();
  await tapPlay();
  expect(await screen.findByText(text())).toBeTruthy();
  expect(screen.queryByTestId('voice-wave', ALL)).toBeNull();
});

test('the old number\'s note reads in plain MSA', () => {
  expect(t.inbox.mediaInCrm).toBe('هذا الملف من رقم الأكاديمية القديم، ولا يمكن تشغيله هنا.');
});

test('another failure keeps the row with «اضغط لإعادة المحاولة»; the next tap asks again', async () => {
  serve(async () => {
    throw new ApiError(500);
  });
  await showVoice();
  await tapPlay();
  expect(await screen.findByText(t.inbox.mediaFailed)).toBeTruthy();
  serve(file);
  await tapPlay();
  await waitFor(() => expect(fetches()).toBe(2));
  await waitFor(() => expect(screen.queryByText(t.inbox.mediaFailed)).toBeNull());
});

test('fetched but never loaded (network, a codec): after 15 s the ring gives way to the retry line', async () => {
  serve(file);
  await statusIs({ isLoaded: false });
  await showVoice();
  jest.useFakeTimers();
  try {
    await tapPlay();
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText(t.inbox.mediaFailed)).toBeNull();
    await act(() => jest.advanceTimersByTime(LOAD_MS));
    expect(screen.getByText(t.inbox.mediaFailed)).toBeTruthy();
  } finally {
    jest.useRealTimers();
  }
});
