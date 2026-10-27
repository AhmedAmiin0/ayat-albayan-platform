import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useVideoPlayer } from 'expo-video';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { message, PHONE } from '../../shared/thread-fixtures';
import { VideoTile, VIDEO_TILE } from './VideoTile';

// The ring and the unloaded waveform are hidden from screen readers (their button speaks): still queried.
const ALL = { includeHiddenElements: true };
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

type Listener = (e: { status: string }) => void;
const listeners: Listener[] = [];
const mockPlayer = {
  status: 'loading',
  play: jest.fn(),
  pause: jest.fn(),
  addListener: jest.fn((_name: string, fn: Listener) => {
    listeners.push(fn);
    return { remove: jest.fn() };
  }),
};
jest.mock('expo-video', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    useVideoPlayer: jest.fn((_source: string, setup?: (p: unknown) => void) => {
      setup?.(mockPlayer);
      return mockPlayer;
    }),
    VideoView: (props: { player: unknown }) => createElement(View, { ...props, player: undefined }),
  };
});

const KIND = t.inbox.media.video;
const PATH = '/threads/%2B966552147730/messages/vd1/file';
const SIGNED = 'https://storage.test/wa-media/vd1.mp4?token=x';
const serve = (answer: () => Promise<unknown>) => mockApiFetch.mockImplementation((p: string) => (p === PATH ? answer() : Promise.resolve(null)));
const show = () =>
  renderWithQuery(<VideoTile message={message({ id: 'vd1', direction: 'inbound', media_mime: 'video/mp4', body: null })} phone={PHONE} kind={KIND} />);
const tap = () => fireEvent.press(screen.getByRole('button', { name: t.inbox.playMedia.replace('{kind}', KIND) }));
const emit = (status: string) => act(() => listeners.forEach((fn) => fn({ status })));

beforeEach(() => {
  mockApiFetch.mockReset();
  listeners.length = 0;
  jest.clearAllMocks();
  serve(async () => ({ url: SIGNED, mime: 'video/mp4', expires_at: '2026-10-27T10:00:00Z' }));
});

test('a dark tile of a fixed size with the big play button and «فيديو»; nothing fetched, no inline video', async () => {
  await show();
  expect(screen.getByTestId('video-tile')).toHaveStyle({ width: VIDEO_TILE.width, height: VIDEO_TILE.height });
  expect(screen.getByText(KIND)).toBeTruthy();
  expect(screen.queryByTestId('video-player')).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalledWith(PATH);
});

test('the tap fetches once and opens it full screen with the system controls, uncut, autoplaying', async () => {
  await show();
  await tap();
  expect(await screen.findByTestId('video-viewer')).toBeTruthy();
  expect(useVideoPlayer).toHaveBeenCalledWith(SIGNED, expect.any(Function));
  expect(mockPlayer.play).toHaveBeenCalled();
  const video = screen.getByTestId('video-player');
  expect([video.props.nativeControls, video.props.contentFit]).toEqual([true, 'contain']);
  expect(mockApiFetch.mock.calls.filter(([p]) => p === PATH)).toHaveLength(1);
});

test('a ring until the video is ready to play', async () => {
  await show();
  await tap();
  await screen.findByTestId('video-viewer');
  expect(screen.getByTestId('media-spinner', ALL)).toBeTruthy();
  await emit('readyToPlay');
  expect(screen.queryByTestId('media-spinner', ALL)).toBeNull();
});

test('«إغلاق» closes it; Android\'s back closes it too; reopening asks nothing again', async () => {
  await show();
  await tap();
  await screen.findByTestId('video-viewer');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.closeVideo }));
  expect(screen.queryByTestId('video-viewer')).toBeNull();
  await tap();
  const viewer = await screen.findByTestId('video-viewer');
  await act(() => viewer.props.onRequestClose());
  expect(screen.queryByTestId('video-viewer')).toBeNull();
  expect(mockApiFetch.mock.calls.filter(([p]) => p === PATH)).toHaveLength(1);
});

test('a video the player cannot load: closed, and the bubble says «اضغط لإعادة المحاولة»', async () => {
  await show();
  await tap();
  await screen.findByTestId('video-viewer');
  await emit('error');
  await waitFor(() => expect(screen.queryByTestId('video-viewer')).toBeNull());
  expect(screen.getByText(t.inbox.mediaFailed)).toBeTruthy();
});

test('410 says the file expired, in place of the tile', async () => {
  serve(async () => {
    throw new ApiError(410, { code: 'media_expired' });
  });
  await show();
  await tap();
  expect(await screen.findByText(t.inbox.mediaExpired)).toBeTruthy();
  expect(screen.queryByTestId('video-tile')).toBeNull();
});
