import { usePulse } from '../../motion/use-pulse';
import { useA11yPref } from '../../primitives/use-a11y-pref';
import { BREATH_MS } from './skeleton-card.helpers';

export function useSkeletonCard() {
  const still = useA11yPref('reduceMotion');
  const pulse = usePulse({ duration: BREATH_MS, still });
  return { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) };
}
