import { authenticate, enrolledKind } from './device';
import { bioFlags } from './flags';
import type { BioNative } from './native';

// The native edges: a binary without the modules hides the feature, never throws.

const none: BioNative = { auth: null, store: null, haptics: null };
const text = { reason: 'R', cancel: 'C' };

function withAuth(over: Record<string, jest.Mock>): BioNative {
  const auth = {
    hasHardwareAsync: jest.fn(async () => true),
    isEnrolledAsync: jest.fn(async () => true),
    supportedAuthenticationTypesAsync: jest.fn(async () => [1]),
    authenticateAsync: jest.fn(async () => ({ success: true })),
    ...over,
  };
  return { ...none, auth } as unknown as BioNative;
}

test('no module (an old APK): no kind, and a prompt reads as removed', async () => {
  expect(await enrolledKind(none)).toBeNull();
  expect(await authenticate(none, text)).toBe('removed');
});

test('the kind: fingerprint, face first when both, iris', async () => {
  const kinds = async (types: number[]) =>
    enrolledKind(withAuth({ supportedAuthenticationTypesAsync: jest.fn(async () => types) }));
  expect(await kinds([1])).toBe('fingerprint');
  expect(await kinds([1, 2])).toBe('face');
  expect(await kinds([3])).toBe('iris');
});

test('no hardware, nothing enrolled, or a throwing check: null', async () => {
  expect(await enrolledKind(withAuth({ hasHardwareAsync: jest.fn(async () => false) }))).toBeNull();
  expect(await enrolledKind(withAuth({ isEnrolledAsync: jest.fn(async () => false) }))).toBeNull();
  const boom = jest.fn(async () => Promise.reject(new Error('x')));
  expect(await enrolledKind(withAuth({ hasHardwareAsync: boom }))).toBeNull();
});

test('prompt errors: not enrolled / no passcode = removed, the rest = fail', async () => {
  const answer = (error: string) =>
    authenticate(
      withAuth({ authenticateAsync: jest.fn(async () => ({ success: false, error })) }),
      text,
    );
  expect(await answer('not_enrolled')).toBe('removed');
  expect(await answer('passcode_not_set')).toBe('removed');
  expect(await answer('user_cancel')).toBe('fail');
  expect(await answer('lockout')).toBe('fail');
  const boom = jest.fn(async () => Promise.reject(new Error('x')));
  expect(await authenticate(withAuth({ authenticateAsync: boom }), text)).toBe('fail');
});

test('flags: in the keystore as «1», deleted when off; no keystore reads as off', async () => {
  const saved = new Map<string, string>();
  const store = {
    getItemAsync: jest.fn(async (k: string) => saved.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void saved.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void saved.delete(k)),
  };
  const flags = bioFlags(Promise.resolve({ ...none, store } as unknown as BioNative));
  await flags.setEnabled(true);
  await flags.setDeclined();
  expect(await flags.enabled()).toBe(true);
  expect(await flags.declined()).toBe(true);
  await flags.setEnabled(false);
  expect(await flags.enabled()).toBe(false);
  expect(store.deleteItemAsync).toHaveBeenCalledWith('ab.biometric.enabled');
  expect(await bioFlags(Promise.resolve(none)).enabled()).toBe(false);
  store.getItemAsync.mockRejectedValueOnce(new Error('keystore'));
  expect(await flags.declined()).toBe(false);
});
