import type { BioFlags } from '../../flags';
import { BioLockStore } from '../lock-store';
import type { BioNative } from '../../native';

// The offer after a fresh sign-in and the settings switch, with the native modules mocked.

function setup({ declined = false, enrolled = true, ok = true, types = [1, 2] } = {}) {
  const flags = { on: false, declined };
  const auth = {
    hasHardwareAsync: jest.fn(async () => true),
    isEnrolledAsync: jest.fn(async () => enrolled),
    supportedAuthenticationTypesAsync: jest.fn(async () => types),
    authenticateAsync: jest.fn(async () =>
      ok ? { success: true } : { success: false, error: 'x' },
    ),
  };
  const native = { auth, store: null, haptics: null } as unknown as BioNative;
  const bioFlags: BioFlags = {
    enabled: async () => flags.on,
    declined: async () => flags.declined,
    setEnabled: async (on) => void (flags.on = on),
    setDeclined: async () => void (flags.declined = true),
  };
  const text = () => ({ reason: 'R', enableReason: 'E', cancel: 'C' });
  return { lock: new BioLockStore({ native, flags: bioFlags, text }), auth, flags };
}

test('a fresh sign-in offers once, naming the face on a phone with both', async () => {
  const s = setup();
  await s.lock.boot();
  await s.lock.signedIn();
  expect(s.lock.getSnapshot()).toMatchObject({ offer: true, kind: 'face' });
});

test('«ليس الآن» hides it and is remembered: never offered again', async () => {
  const s = setup();
  await s.lock.signedIn();
  s.lock.decline();
  expect(s.lock.getSnapshot().offer).toBe(false);
  expect(s.flags.declined).toBe(true);
  await s.lock.signedIn();
  expect(s.lock.getSnapshot().offer).toBe(false);
});

test('no enrolled biometrics: no offer, the feature hides', async () => {
  const s = setup({ enrolled: false });
  await s.lock.signedIn();
  expect(s.lock.getSnapshot()).toMatchObject({ offer: false, kind: null });
});

test('«تفعيل» confirms with one prompt first, then turns the flag on (the app stays open)', async () => {
  const s = setup();
  await s.lock.boot();
  await s.lock.signedIn();
  expect(await s.lock.enable()).toBe(true);
  expect(s.auth.authenticateAsync).toHaveBeenCalledWith({ promptMessage: 'E', cancelLabel: 'C' });
  expect(s.flags.on).toBe(true);
  expect(s.lock.getSnapshot()).toMatchObject({
    offer: false,
    lock: { enabled: true, phase: 'open' },
  });
});

test('a failed confirmation leaves the switch off', async () => {
  const s = setup({ ok: false });
  await s.lock.boot();
  expect(await s.lock.enable()).toBe(false);
  expect(s.flags.on).toBe(false);
  expect(s.lock.getSnapshot().lock.enabled).toBe(false);
});

test('the switch off clears the flag at once', async () => {
  const s = setup();
  await s.lock.boot();
  await s.lock.enable();
  s.lock.disable();
  expect(s.flags.on).toBe(false);
  expect(s.lock.getSnapshot().lock).toMatchObject({ enabled: false, phase: 'open' });
});

test('listeners hear every change until they unsubscribe', async () => {
  const s = setup();
  const heard = jest.fn();
  const off = s.lock.subscribe(heard);
  await s.lock.boot();
  expect(heard).toHaveBeenCalled();
  heard.mockClear();
  off();
  s.lock.decline();
  expect(heard).not.toHaveBeenCalled();
});
