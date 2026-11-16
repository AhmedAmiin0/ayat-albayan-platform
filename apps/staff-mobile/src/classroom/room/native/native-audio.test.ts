import { Platform } from 'react-native';
import type { LiveKitNative } from './livekit-native';
import { nativeAudio } from './native-audio';

const session = {
  startAudioSession: jest.fn(async () => undefined),
  stopAudioSession: jest.fn(async () => undefined),
  getAudioOutputs: jest.fn(async () => ['speaker', 'earpiece', 'headset']),
  selectAudioOutput: jest.fn(async () => undefined),
  showAudioRoutePicker: jest.fn(async () => undefined),
};
const audioOn = (name: 'ios' | 'android') => {
  Object.defineProperty(Platform, 'OS', { get: () => name, configurable: true });
  return nativeAudio({ sdk: { AudioSession: session } } as unknown as LiveKitNative);
};

beforeEach(() => jest.clearAllMocks());

test('Android: a plugged headset is what LiveKit uses; nothing is forced on joining', async () => {
  const audio = audioOn('android');
  await expect(audio.current()).resolves.toBe('headset');
  expect(session.selectAudioOutput).not.toHaveBeenCalled();
});

test('Android: the button steps to the next output the phone has', async () => {
  const audio = audioOn('android');
  await expect(audio.next('headset')).resolves.toBe('speaker');
  expect(session.selectAudioOutput).toHaveBeenLastCalledWith('speaker');
  await expect(audio.next('speaker')).resolves.toBe('earpiece');
  session.getAudioOutputs.mockRejectedValueOnce(new Error('no module'));
  await expect(audio.next('earpiece')).resolves.toBe('earpiece');
});

test('iOS: the system route picker (headset, bluetooth, AirPlay); the OS routes', async () => {
  const audio = audioOn('ios');
  await expect(audio.current()).resolves.toBeNull();
  await expect(audio.next(null)).resolves.toBeNull();
  expect(session.showAudioRoutePicker).toHaveBeenCalled();
  expect(session.selectAudioOutput).not.toHaveBeenCalled();
});

test('start and stop are best effort', async () => {
  const audio = audioOn('android');
  session.startAudioSession.mockRejectedValueOnce(new Error('x'));
  await expect(audio.start()).resolves.toBeUndefined();
  await audio.stop();
  expect(session.stopAudioSession).toHaveBeenCalled();
});
