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

// @expo/ui's DateTimePicker is a native view (Jetpack Compose / SwiftUI) with no jest module: a
// stand-in View that carries its props, so a test reads mode / bounds and confirms
// (props.onValueChange) or cancels (props.onDismiss) the dialog itself.
jest.mock('@expo/ui/community/datetime-picker', () => {
  const { View } = require('react-native');
  const DateTimePicker = (props) => require('react').createElement(View, { testID: 'native-date-time-picker', ...props });
  return { __esModule: true, default: DateTimePicker, DateTimePicker };
});
