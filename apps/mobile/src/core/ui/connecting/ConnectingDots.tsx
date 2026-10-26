import { Animated, View } from 'react-native';
import { useCycle } from '@/core/ui/motion/use-cycle';

const DOTS = [0, 1, 2] as const;
const SIZE = 5;
const CYCLE_MS = 1200;
const STAGGER_MS = 150;
/** The peak of each dot's wave, as a share of its cycle. */
const PEAK = 0.4;
/** Reduce Motion: every dot rests here, no movement. */
export const STILL_DOT_OPACITY = 0.7;

/** One dot: 0.25 → 1 → 0.25 and 0 → −3 → 0 pt every 1.2 s, peaking at 40 %. */
function Dot({ index, color, still }: { index: number; color: string; still: boolean }) {
  const wave = useCycle({ duration: CYCLE_MS, delay: index * STAGGER_MS, still });
  const opacity = still ? STILL_DOT_OPACITY : wave.interpolate({ inputRange: [0, PEAK, 1], outputRange: [0.25, 1, 0.25] });
  const translateY = still ? 0 : wave.interpolate({ inputRange: [0, PEAK, 1], outputRange: [0, -3, 0] });
  return (
    <Animated.View
      testID="connecting-dot"
      style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: color, opacity, transform: [{ translateY }] }}
    />
  );
}

/**
 * Three round dots in a wave, staggered 0 / 150 / 300 ms in reading order: the row follows the layout
 * direction, so in Arabic the wave runs right to left. Decorative (the words beside them speak).
 */
export function ConnectingDots({ color, still }: { color: string; still: boolean }) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {DOTS.map((i) => (
        <Dot key={i} index={i} color={color} still={still} />
      ))}
    </View>
  );
}
