import { NativeModules } from 'react-native';
import type * as LkNative from './livekit-native';

const modules: Record<string, unknown> = NativeModules;
const mockRegister = jest.fn();
jest.mock('@livekit/react-native', () => ({ registerGlobals: () => mockRegister() }), {
  virtual: true,
});
jest.mock('livekit-client', () => ({ Room: jest.fn() }), { virtual: true });

afterEach(() => {
  delete modules.LivekitReactNativeModule;
  jest.resetModules();
});

test('an APK without the native module: no room in the app, nothing loaded', () => {
  jest.isolateModules(() => {
    const m = jest.requireActual<typeof LkNative>('./livekit-native');
    expect(m.liveKitNative()).toBeNull();
  });
  expect(mockRegister).not.toHaveBeenCalled();
});

test('with the module: the SDK loads once and registers its globals once', () => {
  modules.LivekitReactNativeModule = {};
  jest.isolateModules(() => {
    const m = jest.requireActual<typeof LkNative>('./livekit-native');
    const first = m.liveKitNative();
    expect(first?.rtc).toBeDefined();
    expect(m.liveKitNative()).toBe(first);
  });
  expect(mockRegister).toHaveBeenCalledTimes(1);
});

test('the module is there but the SDK fails to load: null, so the press opens the browser', () => {
  modules.LivekitReactNativeModule = {};
  jest.isolateModules(() => {
    jest.doMock(
      '@livekit/react-native',
      () => {
        throw new Error('bad native build');
      },
      { virtual: true },
    );
    const m = jest.requireActual<typeof LkNative>('./livekit-native');
    expect(m.liveKitNative()).toBeNull();
  });
});
