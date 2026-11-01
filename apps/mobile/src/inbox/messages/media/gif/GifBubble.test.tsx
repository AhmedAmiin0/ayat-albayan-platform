import { screen } from '@testing-library/react-native';
import { useVideoPlayer } from 'expo-video';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { MessageFile } from '@/inbox/messages/components/MessageFile';
import { message, PHONE } from '@/inbox/shared/thread-fixtures';

// A GIF bubble (owner 2026-11-01): it plays inline, muted and looping, as WhatsApp.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const SIGNED = 'https://storage.test/wa-media/out/a/r/gif.mp4?token=x';
const gif = message({
  id: 'g1',
  direction: 'outbound',
  media_mime: 'video/mp4',
  interactive_payload: { type: 'gif' },
});

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockResolvedValue({ url: SIGNED, mime: 'video/mp4', expires_at: new Date(Date.now() + 3_600_000).toISOString() });
  jest.mocked(useVideoPlayer).mockClear();
});

test('a GIF signs its file as the bubble renders and plays it muted, looping, on a TextureView', async () => {
  await renderWithQuery(<MessageFile message={gif} phone={PHONE} />);
  const view = await screen.findByTestId('gif-player');
  expect(view.props.surfaceType).toBe('textureView');
  expect(view.props.nativeControls).toBe(false);
  expect(view.props.accessibilityLabel).toBe(t.inbox.media.gif);
  const player = jest.mocked(useVideoPlayer).mock.results.at(-1)?.value;
  expect(player).toMatchObject({ source: SIGNED, loop: true, muted: true });
  expect(player?.play).toHaveBeenCalled();
});

test('any other video keeps the tile and its tap to play', async () => {
  const video = { ...gif, interactive_payload: null };
  await renderWithQuery(<MessageFile message={video} phone={PHONE} />);
  expect(screen.getByTestId('video-tile')).toBeTruthy();
  expect(screen.queryByTestId('gif-player')).toBeNull();
});
