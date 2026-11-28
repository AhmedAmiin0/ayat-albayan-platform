import { act, fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import {
  DeviceEventEmitter,
  type LayoutChangeEvent,
  type LayoutRectangle,
  View,
} from 'react-native';
import type { KeyboardAvoidingViewProps } from 'react-native-keyboard-controller';
import { FAKE_KEYBOARD_EVENT, useFakeKeyboardTop } from './use-fake-keyboard';

/**
 * The library's 'padding' formula (KeyboardAvoidingView in react-native-keyboard-controller):
 * max(y + height − (screenHeight − keyboardHeight − offset), 0), where screenHeight −
 * keyboardHeight is the keyboard's top in window points and y is the frame's place in its parent.
 */
export function FakeKeyboardAvoidingView(props: KeyboardAvoidingViewProps) {
  const { keyboardVerticalOffset = 0, style, behavior, ...rest } = props;
  const top = useFakeKeyboardTop();
  const [frame, setFrame] = useState<LayoutRectangle | null>(null);
  const bottom = frame ? frame.y + frame.height + keyboardVerticalOffset : 0;
  const pads = top !== null && behavior === 'padding';
  const paddingBottom = pads ? Math.max(bottom - top, 0) : 0;
  const onLayout = (e: LayoutChangeEvent) => setFrame(e.nativeEvent.layout);
  return <View {...rest} onLayout={onLayout} style={[style, { paddingBottom }]} />;
}

/** Opens the keyboard with its top at `top` (window points); null closes it. */
export async function keyboardAt(top: number | null) {
  await act(async () => {
    DeviceEventEmitter.emit(FAKE_KEYBOARD_EVENT, top);
    await Promise.resolve();
  });
}

const WINDOW = { x: 0, y: 0, width: 400, height: 800 };

/** Lays a frame out; by default at the window's top, as a Modal's root in a 400 × 800 window. */
export async function laidOut(testID: string, layout: LayoutRectangle = WINDOW) {
  const frame = screen.getByTestId(testID);
  await fireEvent(frame, 'layout', { persist: () => undefined, nativeEvent: { layout } });
  return frame;
}
