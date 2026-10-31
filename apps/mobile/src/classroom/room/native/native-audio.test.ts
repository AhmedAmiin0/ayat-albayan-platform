import { Platform } from 'react-native';
import type { LiveKitNative } from './livekit-native';
import { nativeAudio } from './native-audio';

const session = {
  startAudioSession: jest.fn(async () => undefined),
  stopAudioSession: jest.fn(async () => undefined),
  getAudioOutputs: jest.fn(async () => ['speaker', 'earpiece']),
  selectAudioOutput: jest.fn(async () => undefined),
};
const audio = nativeAudio({ sdk: { AudioSession: session } } as unknown as LiveKitNative);
const os = (name: 'ios' | 'android') =>
  Object.defineProperty(Platform, 'OS', { get: () => name, configurable: true });

beforeEach(() => jest.clearAllMocks());

test('Android: speaker / earpiece among its outputs; a missing one keeps the current route', async () => {
  os('android');
  await audio.route(false);
  expect(session.selectAudioOutput).toHaveBeenCalledWith('earpiece');
  session.getAudioOutputs.mockResolvedValueOnce(['speaker']);
  await audio.route(false);
  expect(session.selectAudioOutput).toHaveBeenCalledTimes(1);
  session.getAudioOutputs.mockRejectedValueOnce(new Error('no module'));
  await expect(audio.route(true)).resolves.toBeUndefined();
});

test('iOS: force_speaker or the default route', async () => {
  os('ios');
  await audio.route(true);
  await audio.route(false);
  expect(session.selectAudioOutput.mock.calls).toEqual([['force_speaker'], ['default']]);
});

test('start and stop are best effort', async () => {
  session.startAudioSession.mockRejectedValueOnce(new Error('x'));
  await expect(audio.start()).resolves.toBeUndefined();
  await audio.stop();
  expect(session.stopAudioSession).toHaveBeenCalled();
});
