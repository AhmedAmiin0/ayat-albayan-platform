import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../lib/i18n/i18n';
import type { AudioSource, AudioSourceEvents, CreateAudioSource } from './audio-source';
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

test('plays, pauses, skips 10 s and cycles the speed through the source', async () => {
  const f = fakeSource();
  await render(<AudioPlayer id="R1" url="https://x/r.mp3" createSource={f.create} />);
  await act(() => f.box.events?.onLoaded(120));
  await fireEvent.press(screen.getByRole('button', { name: t.audioPlayer.play }));
  expect(f.media.play).toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: t.audioPlayer.pause }));
  expect(f.media.pause).toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: t.audioPlayer.forward }));
  expect(f.media.seekTo).toHaveBeenLastCalledWith(10);
  await fireEvent.press(screen.getByRole('button', { name: t.audioPlayer.speedOf.replace('{speed}', '1×') }));
  expect(f.media.setRate).toHaveBeenCalledWith(1.5);
});

test('shows the failure and frees the source on leave', async () => {
  const f = fakeSource();
  const view = await render(<AudioPlayer id="R2" url="https://x/r.mp3" createSource={f.create} />);
  await act(() => f.box.events?.onFailed());
  expect(screen.getByText(t.audioPlayer.failed)).toBeTruthy();
  await view.unmount();
  expect(f.media.release).toHaveBeenCalled();
});
