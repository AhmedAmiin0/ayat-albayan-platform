import { Animated } from 'react-native';
import type { RiseProps } from './Rise.types';
import { useRise } from './use-rise';

/**
 * A card's arrival in a list (the staff app's motion): it fades in while rising 8 dp on a
 * critically damped spring, staggered by its place. Started from its first layout, so no effect
 * runs; the later layouts (its reads arriving and growing it) do not replay it. The rise is
 * computed at render, so a Reduce Motion read that lands mid-way stops the movement at once.
 */
export function Rise({ index, still, children }: RiseProps) {
  const { shown, start, rise } = useRise({ index, still });
  return (
    <Animated.View
      testID="rise"
      onLayout={start}
      style={{ opacity: shown, transform: [{ translateY: rise }] }}
    >
      {children}
    </Animated.View>
  );
}
