// The shared setup first (@ab/mobile-kit: RTL, language, storage, Supabase, connection, tz), then
// this app's audience: the session gate keeps guardians and students (index.ts sets it at boot).
require('@ab/mobile-kit/jest-setup');

jest.mock('@ab/mobile-kit/auth/audience', () => ({
  audience: () => 'family',
  setAudience: jest.fn(),
}));

// @expo/ui's BottomSheet is a native sheet (SwiftUI / Jetpack Compose) with no jest module: a
// stand-in View that shows its children only while presented and carries its props, so a test
// reads it and dismisses it (props.onDismiss) the way a swipe would.
jest.mock('@expo/ui', () => {
  const { createElement } = require('react');
  const { View } = require('react-native');
  const BottomSheet = ({ isPresented, children, ...props }) =>
    isPresented ? createElement(View, props, children) : null;
  return { __esModule: true, BottomSheet };
});
