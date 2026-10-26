import { Animated, View } from 'react-native';
import { NuqtaGlyph } from '@/core/ui/primitives/NuqtaGlyph';
import { usePulse } from '@/core/ui/primitives/use-pulse';

const DOTS = [0, 1, 2] as const;
const STEP_MS = 180;
const PULSE_MS = 420;

/** One calligrapher's dot that swells and brightens in turn; `index` 0 starts the row. */
function Dot({ index, color, still }: { index: number; color: string; still: boolean }) {
  const pulse = usePulse({ duration: PULSE_MS, lead: index * STEP_MS, trail: (DOTS.length - 1 - index) * STEP_MS, still });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  return (
    <Animated.View testID="connecting-dot" style={{ opacity, transform: [{ scale }] }}>
      <NuqtaGlyph shape="fill" color={color} size={10} />
    </Animated.View>
  );
}

/**
 * Three rhombic nuqat (docs/07 §5) pulsing in reading order: the row follows the layout direction,
 * so in Arabic the first dot is on the right and the wave runs right to left. Reduce Motion: still.
 */
export function ConnectingDots({ color, still }: { color: string; still: boolean }) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {DOTS.map((i) => (
        <Dot key={i} index={i} color={color} still={still} />
      ))}
    </View>
  );
}
