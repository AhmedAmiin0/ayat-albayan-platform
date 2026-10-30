import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { KIND, PLAY, players, resetPlayers, signed, statusIs } from './voice-test-kit';
import { VoicePlayback } from './VoicePlayback';

const ALL = { includeHiddenElements: true };
const onFail = jest.fn();
const show = (id = 'v1') => render(<VoicePlayback id={id} url={signed(id)} kind={KIND} onFail={onFail} />);
const player = (id = 'v1') => {
  const p = players.get(signed(id));
  if (!p) throw new Error(`no player for ${id}`);
  return p;
};
const wave = () => screen.getByTestId('voice-wave', ALL);

beforeEach(async () => {
  resetPlayers();
  await statusIs({});
});

test('loaded: plays once; the length shows until it plays, then the position (mediaTime)', async () => {
  await show();
  expect(player().play).toHaveBeenCalledTimes(1);
  expect(screen.getByText('1:05')).toBeTruthy();
  await statusIs({ playing: true, currentTime: 13 });
  await screen.rerender(<VoicePlayback id="v1" url={signed('v1')} kind={KIND} onFail={onFail} />);
  expect(screen.getByText('0:13')).toBeTruthy();
  expect(player().play).toHaveBeenCalledTimes(1);
});

test('playing: the button pauses; at the end it starts over from 0', async () => {
  await statusIs({ playing: true, currentTime: 13 });
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.pauseMedia }));
  expect(player().pause).toHaveBeenCalled();
  await statusIs({ currentTime: 65, didJustFinish: true });
  await screen.rerender(<VoicePlayback id="v1" url={signed('v1')} kind={KIND} onFail={onFail} />);
  await fireEvent.press(screen.getByRole('button', { name: PLAY }));
  expect(player().seekTo).toHaveBeenCalledWith(0);
});

test('a tap on the waveform seeks from the reading start (RTL: the right edge), on release', async () => {
  await statusIs({ playing: true, currentTime: 13 });
  await show();
  await fireEvent(wave(), 'layout', { nativeEvent: { layout: { width: 200 } } });
  await fireEvent(wave(), 'responderGrant', { nativeEvent: { locationX: 50 } });
  expect(player().seekTo).not.toHaveBeenCalled();
  await fireEvent(wave(), 'responderMove', { nativeEvent: { locationX: 150 } });
  await fireEvent(wave(), 'responderRelease', { nativeEvent: { locationX: 150 } });
  // 150 px of 200 from the left = a quarter from the right, where Arabic starts.
  expect(player().seekTo).toHaveBeenCalledWith(0.25 * 65);
  expect(player().seekTo).toHaveBeenCalledTimes(1);
});

test('the waveform is an adjustable control: ±5 s, its value in time', async () => {
  await statusIs({ playing: true, currentTime: 13 });
  await show();
  expect(wave().props.accessibilityValue).toEqual({ min: 0, max: 65, now: 13, text: '0:13 / 1:05' });
  await fireEvent(wave(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  await fireEvent(wave(), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  expect(player().seekTo.mock.calls).toEqual([[18], [8]]);
});

test('the speed chip shows once it plays and cycles 1× → 1.5× → 2× → 1×', async () => {
  await statusIs({ isLoaded: false });
  await show();
  expect(screen.queryByTestId('voice-speed')).toBeNull();
  await statusIs({ playing: true, currentTime: 1 });
  await screen.rerender(<VoicePlayback id="v1" url={signed('v1')} kind={KIND} onFail={onFail} />);
  for (const label of ['1×', '1.5×', '2×']) {
    await fireEvent.press(screen.getByRole('button', { name: t.inbox.playbackSpeed.replace('{rate}', label) }));
  }
  expect(player().setPlaybackRate.mock.calls).toEqual([[1.5], [2], [1]]);
});

test('not loaded: the ring, no play, no seek', async () => {
  await statusIs({ isLoaded: false, duration: 0 });
  await show();
  expect(screen.getByTestId('media-spinner', ALL)).toBeTruthy();
  expect(player().play).not.toHaveBeenCalled();
  expect(wave().props.accessibilityActions).toBeUndefined();
});

test('only one voice note plays at a time: the second pauses the first', async () => {
  await show('v1');
  await show('v2');
  expect(player('v1').pause).toHaveBeenCalledTimes(1);
  expect(player('v2').pause).not.toHaveBeenCalled();
});

test('a new signed URL on rerender never swaps the source mid-play', async () => {
  await show();
  await screen.rerender(<VoicePlayback id="v1" url="https://storage.test/other.ogg" kind={KIND} onFail={onFail} />);
  expect(players.has('https://storage.test/other.ogg')).toBe(false);
});
