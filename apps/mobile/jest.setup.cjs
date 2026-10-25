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
jest.mock('./src/core/lib/http/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signInWithPassword: jest.fn(async () => ({ data: {}, error: null })),
      signOut: jest.fn(async () => ({ error: null })),
    },
  },
}));

// The translation-overrides refresh would call the real API from every flow test: off here.
// lib/i18n-overrides.test.ts tests the real module (jest.requireActual).
jest.mock('./src/core/lib/i18n/i18n-overrides', () => ({
  ...jest.requireActual('./src/core/lib/i18n/i18n-overrides'),
  refreshOverrides: jest.fn(async () => false),
}));

// Every chat bubble can mount the inline players (owner 2026-10-19 #1) and the composer the PDF
// picker; jest has none of their native modules. The player and picker tests mock them again.
jest.mock('expo-audio', () => {
  const player = { play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(async () => undefined) };
  const status = { playing: false, currentTime: 0, duration: 0, didJustFinish: false, isLoaded: false };
  return { useAudioPlayer: jest.fn(() => player), useAudioPlayerStatus: jest.fn(() => status) };
});
jest.mock('expo-video', () => {
  const { createElement } = require('react');
  const { View } = require('react-native');
  return {
    useVideoPlayer: jest.fn((source, setup) => {
      const player = { source, play: jest.fn(), pause: jest.fn() };
      if (setup) setup(player);
      return player;
    }),
    VideoView: ({ player: _player, ...props }) => createElement(View, props),
  };
});
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: null })),
}));
