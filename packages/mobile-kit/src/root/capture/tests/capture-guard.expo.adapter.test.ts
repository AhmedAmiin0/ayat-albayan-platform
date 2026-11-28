import * as ScreenCapture from 'expo-screen-capture';
import { expoCaptureGuard } from '../capture-guard.expo.adapter';

jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(async () => undefined),
  allowScreenCaptureAsync: jest.fn(async () => undefined),
  enableAppSwitcherProtectionAsync: jest.fn(async () => undefined),
  disableAppSwitcherProtectionAsync: jest.fn(async () => undefined),
}));

const lib = jest.mocked(ScreenCapture);

beforeEach(() => jest.clearAllMocks());

test('android: block makes the window secure under one key; allow lifts the same key', async () => {
  const guard = expoCaptureGuard({ switcher: false });
  await guard.block();
  const [key] = lib.preventScreenCaptureAsync.mock.calls[0] ?? [];
  expect(key).toEqual(expect.any(String));
  await guard.allow();
  expect(lib.allowScreenCaptureAsync).toHaveBeenCalledWith(key);
  expect(lib.enableAppSwitcherProtectionAsync).not.toHaveBeenCalled();
  expect(lib.disableAppSwitcherProtectionAsync).not.toHaveBeenCalled();
});

test('ios: block also blurs the app-switcher snapshot at full strength; allow removes it', async () => {
  const guard = expoCaptureGuard({ switcher: true });
  await guard.block();
  expect(lib.preventScreenCaptureAsync).toHaveBeenCalledTimes(1);
  expect(lib.enableAppSwitcherProtectionAsync).toHaveBeenCalledWith(1);
  await guard.allow();
  expect(lib.allowScreenCaptureAsync).toHaveBeenCalledTimes(1);
  expect(lib.disableAppSwitcherProtectionAsync).toHaveBeenCalledTimes(1);
});

test('a failed native call rejects (the hook logs it), the other call still runs', async () => {
  lib.enableAppSwitcherProtectionAsync.mockRejectedValueOnce(new Error('unavailable'));
  await expect(expoCaptureGuard({ switcher: true }).block()).rejects.toThrow('unavailable');
  expect(lib.preventScreenCaptureAsync).toHaveBeenCalledTimes(1);
});
