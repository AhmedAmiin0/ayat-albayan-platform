import { type ReactNode, useContext } from 'react';
import { KeyboardAvoidingView, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

/**
 * How a frame keeps its bottom (a composer, a form's last field) above the keyboard, on both
 * platforms. KeyboardAvoidingView pads by `top + y + height − keyboardTop`, where y is the frame's
 * place in its parent and keyboardTop is in window points, so `windowTop` must be how far that
 * parent starts below the window's top. Android draws edge to edge (Expo SDK 57): the window is no
 * longer resized, and 'height' with no offset left the composer one status-bar height under the
 * keyboard. 'padding' only adds bottom padding: with the keyboard closed it is 0 and nothing moves.
 */
export function keyboardAvoidProps(windowTop: number) {
  return { behavior: 'padding', keyboardVerticalOffset: windowTop } as const;
}

interface KeyboardFrameProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Directly inside <Screen>, whose body starts under the top safe area (the default). False for a
   * frame that is the route's own root (login): it starts at the window's top.
   */
  inScreen?: boolean;
}

export function KeyboardFrame({ children, style, inScreen = true }: KeyboardFrameProps) {
  // ExpoRoot provides the insets; a test without a provider gets a frame at the window's top.
  const top = useContext(SafeAreaInsetsContext)?.top ?? 0;
  return (
    <KeyboardAvoidingView testID="keyboard-frame" style={style} {...keyboardAvoidProps(inScreen ? top : 0)}>
      {children}
    </KeyboardAvoidingView>
  );
}
