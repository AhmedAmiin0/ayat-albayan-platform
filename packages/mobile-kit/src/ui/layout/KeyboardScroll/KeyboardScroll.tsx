import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { space } from '../../../theme';
import type { KeyboardScrollProps } from './KeyboardScroll.types';

/**
 * A form's scroll view: the focused field scrolls above the keyboard as it moves, on Android too
 * (React Native's automaticallyAdjustKeyboardInsets is iOS only, and Android draws edge to edge).
 */
export function KeyboardScroll(props: KeyboardScrollProps) {
  return (
    <KeyboardAwareScrollView
      bottomOffset={space[4]}
      keyboardShouldPersistTaps="handled"
      {...props}
    />
  );
}
