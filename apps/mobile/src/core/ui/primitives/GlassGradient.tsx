import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { GlassStop } from '@/theme';

interface GlassGradientProps {
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
 *
 * The Svg sits in a 0-inset absolute View: insets reach the parent's edges, but a "100%" size on an
 * absolute child is taken from the parent's content box, so an Svg of its own in a padded parent
 * (the tab capsule's 4pt) came out 8pt short and drew a second, off-centre capsule (2026-10-26).
 */
export function GlassGradient({ id, color, stops, radius = 0 }: GlassGradientProps) {
  return (
    <View
      testID={`${id}-fill`}
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            {stops.map(([offset, opacity]) => (
              <Stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" rx={radius} ry={radius} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
