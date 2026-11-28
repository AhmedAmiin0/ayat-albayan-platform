import { type ReactNode, useContext } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

/**
 * How a frame keeps its bottom (a composer, a form's last field) above the keyboard, on both
 * platforms. The library's KeyboardAvoidingView follows the keyboard frame by frame (React Native's
 * own padded only after Android's keyboardDidShow) and pads by `y + height + offset − keyboardTop`,
 * where y is the frame's place in its parent and keyboardTop is in window points, so `windowTop`
 * must be how far that parent starts below the window's top. Android draws edge to edge: the window
 * is not resized. 'padding' only adds bottom padding: with the keyboard closed nothing moves.
 */
export function keyboardAvoidProps(windowTop: number) {
  return { behavior: 'padding', keyboardVerticalOffset: windowTop } as const;
}

interface KeyboardFrameProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Directly inside <Screen>, whose body starts under the top safe area (the default). False for a
   * frame that starts at the window's top: a route's own root (login) or a Modal's root.
   */
  inScreen?: boolean;
  testID?: string;
}

export function KeyboardFrame(props: KeyboardFrameProps) {
  const { children, style, inScreen = true, testID = 'keyboard-frame' } = props;
  // ExpoRoot provides the insets; a test without a provider gets a frame at the window's top.
  const top = useContext(SafeAreaInsetsContext)?.top ?? 0;
  return (
    <KeyboardAvoidingView testID={testID} style={style} {...keyboardAvoidProps(inScreen ? top : 0)}>
      {children}
    </KeyboardAvoidingView>
  );
}
