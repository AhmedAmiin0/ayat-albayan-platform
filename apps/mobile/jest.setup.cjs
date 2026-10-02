// Arabic RTL is the app's default (lib/locale reads the native flag), but jest-expo reports LTR.
// A test that needs English mocks this module again with isRTL: false.
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: true });
  return { __esModule: true, default: { ...actual, isRTL: true, getConstants } };
});

// The query persister and Supabase auth write to AsyncStorage; jest has no native module for it.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// No real Supabase client in tests (it needs a key and starts timers): a signed-out stub.
// A test that needs a session overrides it with its own jest.mock('@/lib/supabase', …).
jest.mock('./src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signInWithPassword: jest.fn(async () => ({ data: {}, error: null })),
      signOut: jest.fn(async () => ({ error: null })),
    },
  },
}));
