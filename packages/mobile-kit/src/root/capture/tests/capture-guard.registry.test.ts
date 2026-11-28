import { captureGuard } from '../capture-guard.registry';

jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(async () => undefined),
  allowScreenCaptureAsync: jest.fn(async () => undefined),
  enableAppSwitcherProtectionAsync: jest.fn(async () => undefined),
  disableAppSwitcherProtectionAsync: jest.fn(async () => undefined),
}));

test('each phone platform has its own guard, kept the same between calls', () => {
  expect(captureGuard('android')).toBe(captureGuard('android'));
  expect(captureGuard('ios')).not.toBe(captureGuard('android'));
});

test('a platform with no native module gets a guard that does nothing and never fails', async () => {
  const guard = captureGuard('web');
  await expect(guard.block()).resolves.toBeUndefined();
  await expect(guard.allow()).resolves.toBeUndefined();
});
