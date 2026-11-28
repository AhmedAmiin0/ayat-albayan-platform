/// <reference types="../../../../assets/images.d.ts" />
import { Animated, Image, View } from 'react-native';
import mark from '../../../../assets/brand/mark.png';
import { ConnectingRing } from '../ConnectingRing';
import type { StartupEmblemProps } from './StartupEmblem.types';
import { BLOCK, GLOW } from './startup-emblem.helpers';
import { useStartupEmblem } from './use-startup-emblem';

/**
 * The 220 pt centre of the startup screen: a soft disc that glows (0.35 → 0.9, 0.96 → 1.04) and the
 * emblem that breathes (1 → 1.045) in one 2.4 s breath, inside the turning gold ring. Decorative.
 * Reduce Motion: nothing moves (the breath rests on its first frame).
 */
export function StartupEmblem({ still }: StartupEmblemProps) {
  const { colors, glowOpacity, glowScale, markScale } = useStartupEmblem({ still });
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
        <Image
          testID="startup-mark"
          source={mark}
          resizeMode="contain"
          style={{ width: 112, height: 120 }}
        />
      </Animated.View>
    </View>
  );
}
