import type { BioFlags } from '../../flags';
import { LOCK_AFTER_MS } from '../../lock-machine';
import { BioLockStore } from '../lock-store';
import type { BioNative } from '../../native';

// The lock store with the three native modules mocked (expo-local-authentication, the keystore
// flags, haptics): the lock's whole life, from the flag read to the sign-out.

type Answer = { success: true } | { success: false; error: string };

function setup({ enabled = false, declined = false, enrolled = true, types = [1] } = {}) {
  const flags = { on: enabled, declined };
  const auth = {
    hasHardwareAsync: jest.fn(async () => true),
    isEnrolledAsync: jest.fn(async () => enrolled),
    supportedAuthenticationTypesAsync: jest.fn(async () => types),
    authenticateAsync: jest.fn<Promise<Answer>, []>(async () => ({ success: true })),
  };
  const haptics = {
    NotificationFeedbackType: { Success: 'success', Error: 'error' },
    notificationAsync: jest.fn(async () => undefined),
  };
  const native = { auth, store: null, haptics } as unknown as BioNative;
  const bioFlags: BioFlags = {
    enabled: async () => flags.on,
    declined: async () => flags.declined,
    setEnabled: jest.fn(async (on: boolean) => void (flags.on = on)),
    setDeclined: jest.fn(async () => void (flags.declined = true)),
  };
  const text = () => ({ reason: 'R', enableReason: 'E', cancel: 'C' });
  const lock = new BioLockStore({ native: Promise.resolve(native), flags: bioFlags, text });
  return { lock, auth, haptics, flags, bioFlags, phase: () => lock.getSnapshot().lock.phase };
}

test('switch off: boot opens the app and never prompts', async () => {
  const s = setup();
  await s.lock.boot();
  expect(s.phase()).toBe('open');
  expect(s.lock.getSnapshot().kind).toBe('fingerprint');
  expect(await s.lock.autoPrompt()).toBe('busy');
  expect(s.auth.authenticateAsync).not.toHaveBeenCalled();
});

test('switch on: locked at boot; the automatic prompt succeeds, a haptic, then finish opens', async () => {
  const s = setup({ enabled: true });
  await s.lock.boot();
  expect(s.phase()).toBe('locked');
  expect(await s.lock.autoPrompt()).toBe('success');
  expect(s.auth.authenticateAsync).toHaveBeenCalledWith({ promptMessage: 'R', cancelLabel: 'C' });
  expect(s.haptics.notificationAsync).toHaveBeenCalledWith('success');
  expect(s.phase()).toBe('prompting');
  s.lock.finish();
  expect(s.phase()).toBe('open');
});

test('cancel: stays locked, an error haptic, no second automatic prompt; the button retries', async () => {
  const s = setup({ enabled: true });
  await s.lock.boot();
  s.auth.authenticateAsync.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
  expect(await s.lock.autoPrompt()).toBe('fail');
  expect(s.lock.getSnapshot().lock).toMatchObject({ phase: 'locked', failed: true });
  expect(s.haptics.notificationAsync).toHaveBeenCalledWith('error');
  expect(await s.lock.autoPrompt()).toBe('busy');
  expect(await s.lock.unlock()).toBe('success');
});

test('a second tap while the prompt is up is ignored', async () => {
  const s = setup({ enabled: true });
  await s.lock.boot();
  const first = s.lock.unlock();
  expect(await s.lock.unlock()).toBe('busy');
  await first;
  expect(s.auth.authenticateAsync).toHaveBeenCalledTimes(1);
});

test('background past 5 minutes locks again; under it the app opens', async () => {
  const s = setup({ enabled: true });
  await s.lock.boot();
  await s.lock.unlock();
  s.lock.finish();
  s.lock.hide(0);
  expect(s.phase()).toBe('covered');
  s.lock.show(LOCK_AFTER_MS - 1);
  expect(s.phase()).toBe('open');
  s.lock.hide(10);
  s.lock.show(10 + LOCK_AFTER_MS);
  expect(s.phase()).toBe('locked');
});

test('biometrics removed from the device: off at boot, flag cleared, the lock stays (sign-in)', async () => {
  const s = setup({ enabled: true, enrolled: false });
  await s.lock.boot();
  expect(s.lock.getSnapshot()).toMatchObject({
    kind: null,
    lock: { enabled: false, phase: 'locked', failed: true },
  });
  expect(s.flags.on).toBe(false);
  expect(await s.lock.autoPrompt()).toBe('busy');
});

test('removed while locked (not_enrolled, confirmed): off, but the app stays covered', async () => {
  const s = setup({ enabled: true });
  await s.lock.boot();
  s.auth.authenticateAsync.mockResolvedValueOnce({ success: false, error: 'not_enrolled' });
  s.auth.isEnrolledAsync.mockResolvedValueOnce(false);
  expect(await s.lock.unlock()).toBe('removed');
  expect(s.lock.getSnapshot()).toMatchObject({
    kind: null,
    lock: { enabled: false, phase: 'locked', failed: true },
  });
  expect(s.flags.on).toBe(false);
});

test('a passing not_available (busy sensor, still enrolled) is a plain failure', async () => {
  const s = setup({ enabled: true });
  await s.lock.boot();
  s.auth.authenticateAsync.mockResolvedValueOnce({ success: false, error: 'not_available' });
  expect(await s.lock.unlock()).toBe('fail');
  expect(s.lock.getSnapshot().lock).toMatchObject({ enabled: true, phase: 'locked', failed: true });
  expect(s.flags.on).toBe(true);
});

test('a flag left by a killed sign-out: the next fresh sign-in clears it and opens', async () => {
  const s = setup({ enabled: true });
  await s.lock.boot();
  await s.lock.signedIn();
  expect(s.phase()).toBe('open');
  expect(s.flags.on).toBe(false);
  expect(s.lock.getSnapshot().offer).toBe(true);
});

test('fallback (signed out): flag cleared, covered until the next sign-in', async () => {
  const s = setup({ enabled: true });
  await s.lock.boot();
  s.lock.signedOut();
  expect(s.flags.on).toBe(false);
  expect(s.lock.getSnapshot().lock).toMatchObject({ enabled: false, phase: 'ended' });
  await s.lock.signedIn();
  expect(s.phase()).toBe('open');
});
