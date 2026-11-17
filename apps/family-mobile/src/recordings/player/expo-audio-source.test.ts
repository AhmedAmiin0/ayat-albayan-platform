import { createAudioPlayer, type AudioStatus } from 'expo-audio';
import { createAudioSource } from './expo-audio-source';

type Listener = (status: AudioStatus) => void;

const BASE: AudioStatus = {
  id: 'p1', currentTime: 0, playbackState: 'idle', timeControlStatus: 'paused',
  reasonForWaitingToPlay: '', mute: false, duration: 0, playing: false, loop: false,
  didJustFinish: false, isBuffering: false, isLoaded: false, playbackRate: 1,
  shouldCorrectPitch: true, isLive: false, currentOffsetFromLive: null, error: null,
};

/** A fake expo-audio player: records the commands, lets the test send status updates. */
function arm(seek: () => Promise<void> = async () => undefined) {
  const box: { listener: Listener | null } = { listener: null };
  const sub = { remove: jest.fn() };
  const player = {
    play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(seek), setPlaybackRate: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn((_name: string, listener: Listener) => {
      box.listener = listener;
      return sub;
    }),
  };
  jest.mocked(createAudioPlayer).mockReturnValue(
    player as unknown as ReturnType<typeof createAudioPlayer>,
  );
  const events = {
    onLoaded: jest.fn(), onTime: jest.fn(), onEnded: jest.fn(), onFailed: jest.fn(),
  };
  const source = createAudioSource({ url: 'https://files.example/r.mp3', startAt: 42, events });
  const send = (patch: Partial<AudioStatus>): void => box.listener?.({ ...BASE, ...patch });
  return { player, sub, events, source, send };
}

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

test('loads the link, jumps to the saved stop once, then reports the clock and the end', async () => {
  const f = arm();
  expect(createAudioPlayer).toHaveBeenCalledWith('https://files.example/r.mp3');
  f.send({ isLoaded: true, duration: 300 });
  expect(f.player.seekTo).toHaveBeenCalledWith(42);
  expect(f.events.onLoaded).toHaveBeenCalledWith(300);
  expect(f.events.onTime).not.toHaveBeenCalled();
  await flush();
  f.send({ isLoaded: true, duration: 300, currentTime: 50 });
  f.send({ isLoaded: true, duration: 300, currentTime: 300, didJustFinish: true });
  expect(f.events.onLoaded).toHaveBeenCalledTimes(1);
  expect(f.player.seekTo).toHaveBeenCalledTimes(1);
  expect(f.events.onTime).toHaveBeenLastCalledWith(300);
  expect(f.events.onEnded).toHaveBeenCalledTimes(1);
});

test('passes the commands through and frees the native player on release', () => {
  const f = arm();
  f.source.play();
  f.source.pause();
  f.source.seekTo(10);
  f.source.setRate(1.5);
  f.source.release();
  expect(f.player.play).toHaveBeenCalled();
  expect(f.player.pause).toHaveBeenCalled();
  expect(f.player.seekTo).toHaveBeenCalledWith(10);
  expect(f.player.setPlaybackRate).toHaveBeenCalledWith(1.5);
  expect(f.sub.remove).toHaveBeenCalled();
  expect(f.player.remove).toHaveBeenCalled();
});

test('an error reports one failure', () => {
  const f = arm();
  f.send({ error: 'network' });
  f.send({ error: 'network' });
  expect(f.events.onFailed).toHaveBeenCalledTimes(1);
});

test('a refused jump is a failure', async () => {
  const f = arm(() => Promise.reject(new Error('seek')));
  f.send({ isLoaded: true, duration: 300 });
  await flush();
  expect(f.events.onFailed).toHaveBeenCalledTimes(1);
});
