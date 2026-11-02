import { PermissionsAndroid, Platform } from 'react-native';
import type { LiveKitNative } from './livekit-native';
import { askCamMic, checkCamMic, openPreview } from './native-media';

const os = (name: 'ios' | 'android') =>
  Object.defineProperty(Platform, 'OS', { get: () => name, configurable: true });
const P = PermissionsAndroid.PERMISSIONS;

test('iOS: granted here, the system asks inside getUserMedia', async () => {
  os('ios');
  expect(await checkCamMic()).toEqual({ mic: 'granted', cam: 'granted' });
  expect(await askCamMic()).toEqual({ mic: 'granted', cam: 'granted' });
});

test('Android: check both, then one requestMultiple', async () => {
  os('android');
  jest.spyOn(PermissionsAndroid, 'check').mockImplementation(async (p) => p === P.RECORD_AUDIO);
  expect(await checkCamMic()).toEqual({ mic: 'granted', cam: 'denied' });
  jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({
    [P.RECORD_AUDIO]: 'granted',
    [P.CAMERA]: 'never_ask_again',
  } as Awaited<ReturnType<typeof PermissionsAndroid.requestMultiple>>);
  expect(await askCamMic()).toEqual({ mic: 'granted', cam: 'blocked' });
});

const lkWith = (create: () => Promise<unknown>) =>
  ({ lk: { createLocalVideoTrack: create } }) as unknown as LiveKitNative;

test('the preview: the stream url and a stop; none when the camera cannot open', async () => {
  const stop = jest.fn();
  const cam = await openPreview(
    lkWith(async () => ({ mediaStream: { toURL: () => 'stream-1' }, stop })),
  );
  expect(cam?.streamUrl).toBe('stream-1');
  cam?.stop();
  expect(stop).toHaveBeenCalled();
  expect(await openPreview(lkWith(async () => ({ mediaStream: undefined, stop })))).toBeNull();
  expect(await openPreview(lkWith(async () => Promise.reject(new Error('NotAllowed'))))).toBeNull();
});
