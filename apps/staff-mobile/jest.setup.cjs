// After the kit's shared setup (jest.config.cjs: RTL, language, storage, Supabase, connection, tz).

// WhatsApp calls (docs/28 PR 2): LiveKit's react-native-webrtc fork (docs/35) is a native module; the call tests inject fakes.
jest.mock('@livekit/react-native-webrtc', () => ({
  RTCPeerConnection: jest.fn(),
  mediaDevices: { getUserMedia: jest.fn(async () => { throw new Error('no webrtc in tests'); }) },
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

// @expo/ui's DateTimePicker is a native view (Jetpack Compose / SwiftUI) with no jest module: a
// stand-in View that carries its props, so a test reads mode / bounds and confirms
// (props.onValueChange) or cancels (props.onDismiss) the dialog itself.
jest.mock('@expo/ui/community/datetime-picker', () => {
  const { View } = require('react-native');
  const DateTimePicker = (props) => require('react').createElement(View, { testID: 'native-date-time-picker', ...props });
  return { __esModule: true, default: DateTimePicker, DateTimePicker };
});
