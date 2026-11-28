// The jest setup both Expo apps and this package share (each app's jest.setup.cjs requires it
// first): RTL, the phone's language, AsyncStorage, a signed-out Supabase, a still connection store,
// no overrides refresh and a Riyadh viewer. Paths are this package's own modules, which the apps'
// code reaches through @ab/mobile-kit, so the mocks hold there too.
// Arabic RTL is the app's default (lib/locale reads the native flag), but jest-expo reports LTR.
// A test that needs English mocks this module again with isRTL: false.
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: true });
  return { __esModule: true, default: { ...actual, isRTL: true, getConstants } };
});

// The phone's language (locale-switch: nothing saved follows it). jest-expo ships no ExpoLocalization
// mock, so without this the import could throw. An Arabic phone, like the RTL default above.
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageTag: 'ar', languageCode: 'ar', textDirection: 'rtl' }]),
}));

// The query persister and Supabase auth write to AsyncStorage; jest has no native module for it.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// No real Supabase client in tests (it needs a key and starts timers): a signed-out stub.
// A test that needs a session overrides it with its own jest.mock('@ab/mobile-kit/lib/http/supabase', …).
jest.mock('./src/lib/http/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signInWithPassword: jest.fn(async () => ({ data: {}, error: null })),
      signOut: jest.fn(async () => ({ error: null })),
    },
    // Realtime (the calls' nudge, docs/28, and the inbox's live channel): a channel that never fires,
    // so the inbox keeps its polls.
    realtime: { setAuth: jest.fn(async () => undefined) },
    channel: jest.fn(() => {
      const channel = { on: jest.fn(() => channel), subscribe: jest.fn(() => channel) };
      return channel;
    }),
    removeChannel: jest.fn(async () => 'ok'),
  },
}));

// The root's maintenance probe would fetch every 10 s in every suite; its own test is real.
jest.mock('./src/root/use-maintenance', () => ({
  maintenanceQuery: { queryKey: ['maintenance'] },
  useMaintenance: () => ({ view: 'open', checking: false, retry: () => undefined }),
}));

// The connection probe loop would call fetch (stealing a test's mocked responses) and flip TanStack's
// onlineManager: a still store here. The connectivity tests build their own with createConnectivity.
jest.mock('./src/lib/connectivity/connectivity', () => {
  const state = { status: 'online', since: null, attempt: 0, active: true, hiddenAt: null };
  return {
    connectivity: {
      getState: () => state,
      subscribe: () => () => undefined,
      reportFailure: jest.fn(),
      reportReached: jest.fn(),
      setActive: jest.fn(),
      probeNow: jest.fn(),
    },
  };
});

// The translation-overrides refresh would call the real API from every flow test: off here.
// lib/i18n-overrides.test.ts tests the real module (jest.unmock).
jest.mock('./src/lib/i18n/i18n-overrides', () => ({
  ...jest.requireActual('./src/lib/i18n/i18n-overrides'),
  refreshOverrides: jest.fn(async () => false),
}));

// Times on screen read in the viewer's zone (docs/34 §2): the person's tz, else the device's. The
// CI machine's zone must not change an expectation, so every suite starts as a Riyadh viewer on a
// Riyadh phone (a signed-in flow whose /auth/me has no tz falls back to the device's); a test that
// needs another viewer calls setViewerPersonTz itself and resets it after.
// '@ab/time' owns deviceTimeZone and '@ab/shared' still re-exports it: both read the one fake
// (src/testing/device-zone), so setDeviceZone moves the phone whichever path the code imports.
jest.mock('@ab/time', () => ({
  ...jest.requireActual('@ab/time'),
  deviceTimeZone: () => require('./src/testing/device-zone').deviceZone(),
}));
jest.mock('@ab/shared', () => ({
  ...jest.requireActual('@ab/shared'),
  deviceTimeZone: () => require('./src/testing/device-zone').deviceZone(),
}));
require('@ab/client-core').setViewerPersonTz('Asia/Riyadh');

// The biometric lock (src/biometric): a still store with no biometrics on the device, so the apps'
// screens render as without the feature (no lock, no switch, no offer) and tests that stub Supabase
// partially never reach its auth listener. The lock's own tests unmock it or reset the fake.
jest.mock('./src/biometric/core/bio-lock', () => {
  const { bioLockMock } = require('./src/testing/bio-lock');
  void bioLockMock.boot({ enabled: false, enrolled: false });
  return bioLockMock;
});

// @expo/ui's BottomSheet is a native sheet (SwiftUI / Jetpack Compose) with no jest module: a
// stand-in View that shows its children only while presented and carries its props (the lesson
// room's participants; the family app's children sheet), so a test reads and dismisses it.
jest.mock('@expo/ui', () => {
  const { createElement } = require('react');
  const { View } = require('react-native');
  const BottomSheet = ({ isPresented, children, ...props }) =>
    isPresented ? createElement(View, { testID: 'native-bottom-sheet', ...props }, children) : null;
  return { __esModule: true, BottomSheet };
});

// A native module: the library's own jest mock, but its KeyboardAvoidingView pads by the library's
// formula against a fake keyboard (src/testing/keyboard-fake), so a test sees a frame clear it.
jest.mock('react-native-keyboard-controller', () => ({
  ...require('react-native-keyboard-controller/jest'),
  KeyboardAvoidingView: require('./src/testing/keyboard-fake').FakeKeyboardAvoidingView,
}));
