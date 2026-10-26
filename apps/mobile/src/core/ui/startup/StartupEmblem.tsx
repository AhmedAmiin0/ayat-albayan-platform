import { Animated, Image, View } from 'react-native';
import { usePulse } from '@/core/ui/motion/use-pulse';
import { type Palette, type ThemeName, useTheme } from '@/theme';
import mark from '../../../../assets/brand/mark.png';
import { ConnectingRing } from './ConnectingRing';

const BLOCK = 220;
const GLOW = 168;
/** One way of the 2.4 s breath (0 → 1 → 0, ease-in-out). */
const BREATH_MS = 1200;

/** The disc and the ring's track per scheme (approved design, 2026-10-26). */
export function emblemColors(name: ThemeName, color: Palette) {
  return name === 'dark'
    ? { glow: color.leatherLift, track: color.leatherLift, arc: color.gold }
    : { glow: color.page, track: color.leatherDeep, arc: color.gold };
}

/**
 * The 220 pt centre of the startup screen: a soft disc that glows (0.35 → 0.9, 0.96 → 1.04) and the
 * emblem that breathes (1 → 1.045) in one 2.4 s breath, inside the turning gold ring. Decorative.
 * Reduce Motion: nothing moves (the breath rests on its first frame).
 */
export function StartupEmblem({ still }: { still: boolean }) {
  const { name, color } = useTheme();
  const colors = emblemColors(name, color);
  const breath = usePulse({ duration: BREATH_MS, still });
  const glowOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] });
  const glowScale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] });
  const markScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] });
  return (
    <View
      style={{ width: BLOCK, height: BLOCK, alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        testID="startup-glow"
        style={{
          position: 'absolute',
          width: GLOW,
          height: GLOW,
          borderRadius: GLOW / 2,
          backgroundColor: colors.glow,
          opacity: glowOpacity,
          transform: [{ scale: glowScale }],
        }}
      />
      <ConnectingRing track={colors.track} arc={colors.arc} still={still} />
      <Animated.View style={{ transform: [{ scale: markScale }] }}>
        <Image testID="startup-mark" source={mark} resizeMode="contain" style={{ width: 112, height: 120 }} />
      </Animated.View>
    </View>
  );
}
