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
// A test that needs a session overrides it with its own jest.mock('@/lib/supabase', …).
jest.mock('./src/core/lib/http/supabase', () => ({
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

// WhatsApp calls (docs/28 PR 2): LiveKit's react-native-webrtc fork (docs/35) is a native module; the call tests inject fakes.
jest.mock('@livekit/react-native-webrtc', () => ({
  RTCPeerConnection: jest.fn(),
  mediaDevices: { getUserMedia: jest.fn(async () => { throw new Error('no webrtc in tests'); }) },
}));

// The connection probe loop would call fetch (stealing a test's mocked responses) and flip TanStack's
// onlineManager: a still store here. The connectivity tests build their own with createConnectivity.
jest.mock('./src/core/lib/connectivity/connectivity', () => {
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
// lib/i18n-overrides.test.ts tests the real module (jest.requireActual).
jest.mock('./src/core/lib/i18n/i18n-overrides', () => ({
  ...jest.requireActual('./src/core/lib/i18n/i18n-overrides'),
  refreshOverrides: jest.fn(async () => false),
}));

// Every chat bubble can mount a voice note or a video viewer (owner 2026-10-19 #1) and the composer the PDF
// picker; jest has none of their native modules. The player and picker tests mock them again.
jest.mock('expo-audio', () => {
  const player = { play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(async () => undefined), setPlaybackRate: jest.fn() };
  const status = { playing: false, currentTime: 0, duration: 0, didJustFinish: false, isLoaded: false, isBuffering: false };
  return {
    useAudioPlayer: jest.fn(() => player),
    useAudioPlayerStatus: jest.fn(() => status),
    setAudioModeAsync: jest.fn(async () => undefined),
  };
});
jest.mock('expo-video', () => {
  const { createElement } = require('react');
  const { View } = require('react-native');
  return {
    useVideoPlayer: jest.fn((source, setup) => {
      const player = { source, status: 'loading', play: jest.fn(), pause: jest.fn(), addListener: jest.fn(() => ({ remove: jest.fn() })) };
      if (setup) setup(player);
      return player;
    }),
    VideoView: ({ player: _player, ...props }) => createElement(View, props),
  };
});
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: null })),
}));

// FlashList measures nothing in jest (zero layout = no rows): a 400×900 window and 100pt rows, as the
// library's own jestSetup (whose first mock, FlashList → RecyclerView, breaks on 2.0.2: not exported).
// A private dist path: re-check it when FlashList is upgraded.
jest.mock('@shopify/flash-list/dist/recyclerview/utils/measureLayout', () => {
  const actual = jest.requireActual('@shopify/flash-list/dist/recyclerview/utils/measureLayout');
  const window = () => ({ x: 0, y: 0, width: 400, height: 900 });
  return {
    ...actual,
    measureParentSize: jest.fn(window),
    measureFirstChildLayout: jest.fn(window),
    measureItemLayout: jest.fn(() => ({ x: 0, y: 0, width: 100, height: 100 })),
  };
});
