import { NativeModules } from 'react-native';
import type * as LkNative from './livekit-native';

const modules: Record<string, unknown> = NativeModules;
const mockRegister = jest.fn();
const mockSdkLoaded = jest.fn();
const mockSdk = () => {
  mockSdkLoaded();
  return { registerGlobals: () => mockRegister() };
};
const mockClient = () => ({ Room: jest.fn() });
jest.mock('@livekit/react-native', () => mockSdk(), { virtual: true });
jest.mock('livekit-client', () => mockClient(), { virtual: true });
jest.mock('@livekit/react-native-webrtc', () => ({ RTCView: jest.fn() }), { virtual: true });

afterEach(() => {
  delete modules.LivekitReactNativeModule;
  jest.clearAllMocks();
  jest.resetModules();
  jest.doMock('@livekit/react-native', () => mockSdk(), { virtual: true });
  jest.doMock('livekit-client', () => mockClient(), { virtual: true });
});

const fresh = (): typeof LkNative => jest.requireActual<typeof LkNative>('./livekit-native');

test('an APK without the native module: null, and the SDK is never imported', async () => {
  const m = fresh();
  await expect(m.liveKitNative()).resolves.toBeNull();
  expect(mockSdkLoaded).not.toHaveBeenCalled();
  expect(mockRegister).not.toHaveBeenCalled();
});

test('with the module: the SDK, the client and the fork load, globals registered first', async () => {
  modules.LivekitReactNativeModule = {};
  const n = await fresh().liveKitNative();
  expect(n?.sdk.registerGlobals).toBeDefined();
  expect(n?.lk.Room).toBeDefined();
  expect(n?.rtc.RTCView).toBeDefined();
  expect(mockRegister).toHaveBeenCalledTimes(1);
});

test('loaded once: every caller shares one promise and one registerGlobals', async () => {
  modules.LivekitReactNativeModule = {};
  const m = fresh();
  const first = m.liveKitNative();
  expect(m.liveKitNative()).toBe(first);
  expect(await m.liveKitNative()).toBe(await first);
  expect(mockRegister).toHaveBeenCalledTimes(1);
});

test('the module is there but the SDK fails to load: null, so the press opens the browser', async () => {
  modules.LivekitReactNativeModule = {};
  jest.doMock(
    '@livekit/react-native',
    () => {
      throw new Error('bad native build');
    },
    { virtual: true },
  );
  await expect(fresh().liveKitNative()).resolves.toBeNull();
});

test('the client fails after the SDK: null, never a half-loaded room', async () => {
  modules.LivekitReactNativeModule = {};
  jest.doMock(
    'livekit-client',
    () => {
      throw new Error('missing');
    },
    { virtual: true },
  );
  await expect(fresh().liveKitNative()).resolves.toBeNull();
});
