import type * as Native from './native';

const mockLoads = jest.fn();
jest.mock(
  'expo-local-authentication',
  () => {
    mockLoads('auth');
    return { authenticateAsync: jest.fn() };
  },
  { virtual: true },
);
const mockStore = () => ({ getItemAsync: jest.fn() });
jest.mock('expo-secure-store', () => mockStore(), { virtual: true });
jest.mock('expo-haptics', () => ({ notificationAsync: jest.fn() }), { virtual: true });

afterEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  jest.doMock('expo-secure-store', () => mockStore(), { virtual: true });
});

const fresh = (): typeof Native => jest.requireActual<typeof Native>('./native');

test('every module present: all three loaded', async () => {
  const n = await fresh().bioNative();
  expect(n.auth?.authenticateAsync).toBeDefined();
  expect(n.store?.getItemAsync).toBeDefined();
  expect(n.haptics?.notificationAsync).toBeDefined();
});

test('an APK without a module (its import throws): that one is null, the others still load', async () => {
  jest.doMock(
    'expo-secure-store',
    () => {
      throw new Error("Cannot find native module 'ExpoSecureStore'");
    },
    { virtual: true },
  );
  const n = await fresh().bioNative();
  expect(n.store).toBeNull();
  expect(n.auth).not.toBeNull();
  expect(n.haptics).not.toBeNull();
});

test('loaded once: one shared promise, each module imported once', async () => {
  const m = fresh();
  const first = m.bioNative();
  expect(m.bioNative()).toBe(first);
  await first;
  await m.bioNative();
  expect(mockLoads).toHaveBeenCalledTimes(1);
});
