import { Text, type TextProps } from 'react-native';

/**
 * Text that starts at the inline-start under forceRTL (docs/07 §12, §14.1). An unset textAlign
 * can sit at the physical left on iOS when the device language is not Arabic; RN swaps 'left'
 * to the right in RTL, so 'left' means "start". Pass textAlign: 'center' to override.
 */
export function AppText({ style, ...props }: TextProps) {
  return <Text {...props} style={[{ textAlign: 'left' }, style]} />;
}
