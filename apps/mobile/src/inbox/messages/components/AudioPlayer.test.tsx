import { fireEvent, render, screen } from '@testing-library/react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { t } from '@/core/lib/i18n/i18n';
import { AudioPlayer } from './AudioPlayer';

const mockPlayer = { play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(async () => undefined) };
jest.mock('expo-audio', () => ({
  useAudioPlayer: jest.fn(() => mockPlayer),
  useAudioPlayerStatus: jest.fn(),
}));

type Status = ReturnType<typeof useAudioPlayerStatus>;
const status = jest.mocked(useAudioPlayerStatus);
const at = (fields: Partial<Status>) =>
  status.mockReturnValue({ playing: false, currentTime: 0, duration: 65, didJustFinish: false, ...fields } as Status);
const KIND = t.inbox.media.audio;
const play = t.inbox.playMedia.replace('{kind}', KIND);
const show = (url = 'https://s.test/a.ogg') => render(<AudioPlayer url={url} kind={KIND} />);

beforeEach(() => jest.clearAllMocks());

test('starts on mount (the tap was «تشغيل») and shows the length as m:ss', async () => {
  at({});
  await show();
  expect(useAudioPlayer).toHaveBeenCalledWith('https://s.test/a.ogg');
  expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  expect(screen.getByText('1:05')).toBeTruthy();
  expect(screen.getByRole('button', { name: play })).toBeTruthy();
});

test('playing: «إيقاف مؤقت» pauses; the position and the bar follow', async () => {
  at({ playing: true, currentTime: 13 });
  await show();
  expect(screen.getByText('0:13')).toBeTruthy();
  expect(screen.getByTestId('audio-progress')).toHaveStyle({ width: '20%' });
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.pauseMedia }));
  expect(mockPlayer.pause).toHaveBeenCalled();
});

test('paused: «تشغيل» plays again from where it stopped', async () => {
  at({ currentTime: 20 });
  await show();
  mockPlayer.play.mockClear();
  await fireEvent.press(screen.getByRole('button', { name: play }));
  expect(mockPlayer.seekTo).not.toHaveBeenCalled();
  expect(mockPlayer.play).toHaveBeenCalledTimes(1);
});

test('at the end: «تشغيل» starts over', async () => {
  at({ currentTime: 65, didJustFinish: true });
  await show();
  await fireEvent.press(screen.getByRole('button', { name: play }));
  expect(mockPlayer.seekTo).toHaveBeenCalledWith(0);
});

test('a new signed URL on rerender never swaps the source mid-play', async () => {
  at({ playing: true });
  const view = await show('https://s.test/first.ogg');
  await view.rerender(<AudioPlayer url="https://s.test/second.ogg" kind={KIND} />);
  expect(useAudioPlayer).not.toHaveBeenCalledWith('https://s.test/second.ogg');
});
