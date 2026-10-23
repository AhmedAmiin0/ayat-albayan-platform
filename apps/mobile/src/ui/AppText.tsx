import type { Ref } from 'react';
import { Text, type TextProps } from 'react-native';

/**
 * Text that starts at the inline-start in either language (docs/07 §12, §14.1). An unset textAlign
 * follows the phone's language on iOS, not the app's; RN swaps 'left' to the right in RTL
 * (doLeftAndRightSwapInRTL), so 'left' means "start": right in Arabic, left in English.
 * Pass textAlign: 'center' to override.
 */
/** The node behind an AppText, for a ref (focus, measure) without importing Text elsewhere. */
export type AppTextNode = Text;

export function AppText({ style, ref, ...props }: TextProps & { ref?: Ref<Text> }) {
  return <Text {...props} ref={ref} style={[{ textAlign: 'left' }, style]} />;
}
