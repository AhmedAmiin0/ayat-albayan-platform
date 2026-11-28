import { usePulse } from '../../motion/use-pulse';
import { useTheme } from '../../../theme';
import type { StartupEmblemProps } from './StartupEmblem.types';
import { emblemColors } from './startup-emblem.helpers';

/** One way of the 2.4 s breath (0 → 1 → 0, ease-in-out). */
const BREATH_MS = 1200;
export function useStartupEmblem({ still }: Pick<StartupEmblemProps, 'still'>) {
  const { name, color } = useTheme();
  const colors = emblemColors(name, color);
  const breath = usePulse({ duration: BREATH_MS, still });
  const glowOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] });
  const glowScale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] });
  const markScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] });
  return { colors, glowOpacity, glowScale, markScale };
}
