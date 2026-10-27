import { setAudioModeAsync } from 'expo-audio';

type Playback = typeof import('./playback');
// A fresh module per test: the registry and the audio mode are module state.
const fresh = (): Playback => {
  let mod: Playback | undefined;
  jest.isolateModules(() => {
    mod = jest.requireActual<Playback>('./playback');
  });
  if (!mod) throw new Error('playback not loaded');
  return mod;
};
const mode = jest.mocked(setAudioModeAsync);

beforeEach(() => mode.mockReset().mockResolvedValue(undefined));

test('only one plays at a time: starting another pauses the first; the same one again never pauses itself', () => {
  const { claimPlayback } = fresh();
  const first = jest.fn();
  const second = jest.fn();
  claimPlayback('a', first);
  claimPlayback('a', first);
  expect(first).not.toHaveBeenCalled();
  claimPlayback('b', second);
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).not.toHaveBeenCalled();
});

test('a released note (unmounted) is never paused later', () => {
  const { claimPlayback, releasePlayback } = fresh();
  const gone = jest.fn();
  claimPlayback('a', gone);
  releasePlayback('a');
  claimPlayback('b', jest.fn());
  expect(gone).not.toHaveBeenCalled();
});

test('the audio mode is set once: heard on silent, other audio paused, no background play', async () => {
  const { ensureAudioMode } = fresh();
  await Promise.all([ensureAudioMode(), ensureAudioMode()]);
  expect(mode).toHaveBeenCalledTimes(1);
  expect(mode).toHaveBeenCalledWith({ playsInSilentMode: true, interruptionMode: 'doNotMix', shouldPlayInBackground: false });
});

test('a failed audio mode is tried again on the next voice note', async () => {
  const { ensureAudioMode } = fresh();
  mode.mockRejectedValueOnce(new Error('no session'));
  await ensureAudioMode();
  await ensureAudioMode();
  expect(mode).toHaveBeenCalledTimes(2);
});
