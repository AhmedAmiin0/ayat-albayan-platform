import { render, screen } from '@testing-library/react-native';
import { useVideoPlayer } from 'expo-video';
import { t } from '@/lib/i18n';
import { VideoPlayer } from './VideoPlayer';

const mockPlayer = { play: jest.fn() };
jest.mock('expo-video', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    useVideoPlayer: jest.fn((_source: string, setup?: (p: unknown) => void) => {
      setup?.(mockPlayer);
      return mockPlayer;
    }),
    VideoView: ({ player, ...props }: { player: unknown; nativeControls?: boolean }) =>
      createElement(View, { ...props, testID: 'video-player', 'data-native': props.nativeControls, 'data-player': player }),
  };
});

const KIND = t.inbox.media.video;

beforeEach(() => jest.clearAllMocks());

test('the signed video inline with the system controls, started once loaded', async () => {
  await render(<VideoPlayer url="https://s.test/v.mp4" kind={KIND} />);
  expect(useVideoPlayer).toHaveBeenCalledWith('https://s.test/v.mp4', expect.any(Function));
  expect(mockPlayer.play).toHaveBeenCalled();
  const view = screen.getByTestId('video-player');
  expect(view.props['data-native']).toBe(true);
  expect(view.props['data-player']).toBe(mockPlayer);
  expect(view.props.accessibilityLabel).toBe(KIND);
});

test('a new signed URL on rerender keeps the first source', async () => {
  const view = await render(<VideoPlayer url="https://s.test/first.mp4" kind={KIND} />);
  await view.rerender(<VideoPlayer url="https://s.test/second.mp4" kind={KIND} />);
  expect(useVideoPlayer).not.toHaveBeenCalledWith('https://s.test/second.mp4', expect.any(Function));
});
