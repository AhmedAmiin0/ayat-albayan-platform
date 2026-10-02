import { Text, type TextProps } from 'react-native';

/**
 * Text that starts at the inline-start in either language (docs/07 §12, §14.1). An unset textAlign
 * follows the phone's language on iOS, not the app's; RN swaps 'left' to the right in RTL
 * (doLeftAndRightSwapInRTL), so 'left' means "start": right in Arabic, left in English.
 * Pass textAlign: 'center' to override.
 */
export function AppText({ style, ...props }: TextProps) {
  return <Text {...props} style={[{ textAlign: 'left' }, style]} />;
}
