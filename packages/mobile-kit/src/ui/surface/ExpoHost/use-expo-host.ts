import { I18nManager } from 'react-native';
import { useTheme } from '../../../theme';
import type { ExpoHostProps, ExpoHostView } from './ExpoHost.types';

/**
 * The native subtree follows the app, not the device: the theme the user picked (Appearance), the
 * app's direction (RTL in Arabic) and the brand fill as the seed, so Material 3 / SwiftUI tint
 * controls in the same green as the React Native buttons.
 */
export function useExpoHost({ ltr = false, matchContents = true }: ExpoHostProps): ExpoHostView {
  const { name, color } = useTheme();
  const rtl = I18nManager.isRTL && !ltr;
  return {
    colorScheme: name,
    seedColor: color.lapisFill,
    layoutDirection: rtl ? 'rightToLeft' : 'leftToRight',
    matchContents,
  };
}
