import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { I18nManager } from 'react-native';
import { t } from '../../../../lib/i18n/i18n';
import type { AudioSource, AudioSourceEvents, CreateAudioSource } from '../audio-source';
import { AudioPlayer } from './AudioPlayer';

/** A fake media: records the commands, lets the test report what the media did. */
function fakeSource() {
  const media: AudioSource = {
    play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(), setRate: jest.fn(), release: jest.fn(),
  };
  const box: { events: AudioSourceEvents | null } = { events: null };
  const create: CreateAudioSource = ({ events }) => {
    box.events = events;
    return media;
  };
  return { media, create, box };
}

test('plays, pauses, skips 10 s and picks a speed through the source', async () => {
  const f = fakeSource();
  await render(<AudioPlayer id="R1" url="https://x/r.mp3" createSource={f.create} />);
  await act(() => f.box.events?.onLoaded(120));
  await fireEvent.press(screen.getByRole('button', { name: t.audioPlayer.play }));
  expect(f.media.play).toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: t.audioPlayer.pause }));
  expect(f.media.pause).toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: t.audioPlayer.forward }));
  expect(f.media.seekTo).toHaveBeenLastCalledWith(10);
  await fireEvent.press(screen.getByRole('radio', { name: '1.5×' }));
  expect(f.media.setRate).toHaveBeenCalledWith(1.5);
  expect(screen.getByRole('radio', { name: '1.5×' }).props.accessibilityState).toMatchObject({
    checked: true,
  });
});

test('the bar seeks: a tap lands on its share, a screen reader swipe moves 10 s', async () => {
  const f = fakeSource();
  await render(<AudioPlayer id="R3" url="https://x/r.mp3" createSource={f.create} />);
  await act(() => f.box.events?.onLoaded(120));
  const bar = screen.getByRole('adjustable', { name: t.audioPlayer.seek });
  await fireEvent(bar, 'layout', { nativeEvent: { layout: { width: 200 } } });
  // The app runs right-to-left: the bar fills from the right, so a quarter from the left is 3/4.
  const rtl = I18nManager.isRTL;
  await fireEvent(bar, 'responderGrant', { nativeEvent: { locationX: 50 } });
  expect(f.media.seekTo).toHaveBeenLastCalledWith(rtl ? 90 : 30);
  await fireEvent(bar, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  expect(f.media.seekTo).toHaveBeenLastCalledWith(rtl ? 80 : 20);
});

test('shows the failure and frees the source on leave', async () => {
  const f = fakeSource();
  const view = await render(<AudioPlayer id="R2" url="https://x/r.mp3" createSource={f.create} />);
  await act(() => f.box.events?.onFailed());
  expect(screen.getByText(t.audioPlayer.failed)).toBeTruthy();
  await view.unmount();
  expect(f.media.release).toHaveBeenCalled();
});
