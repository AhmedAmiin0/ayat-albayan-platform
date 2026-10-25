import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { GlassStop } from '@/theme';

export interface GlassGradientProps {
  /** Unique within its Svg root. */
  id: string;
  color: string;
  stops: readonly GlassStop[];
  radius?: number;
}

/**
 * A top-to-bottom gradient of one colour filling its parent, drawn with react-native-svg (in the APK;
 * no gradient library needed). A stop's alpha must be its opacity: react-native-svg drops the
 * colour's own alpha. Decorative: hidden from screen readers.
 */
export function GlassGradient({ id, color, stops, radius = 0 }: GlassGradientProps) {
  return (
    <Svg
      width="100%"
      height="100%"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {stops.map(([offset, opacity]) => (
            <Stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" rx={radius} ry={radius} fill={`url(#${id})`} />
    </Svg>
  );
}
