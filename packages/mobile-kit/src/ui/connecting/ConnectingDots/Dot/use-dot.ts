import { useCycle } from '../../../motion/use-cycle';
import { STILL_DOT_OPACITY } from '../connecting-dots.helpers';
import type { DotProps } from './Dot.types';

const CYCLE_MS = 1200;
const STAGGER_MS = 150;
/** The peak of each dot's wave, as a share of its cycle. */
const PEAK = 0.4;

/** 0.25 → 1 → 0.25 and 0 → −3 → 0 pt every 1.2 s, peaking at 40 %. */
export function useDot({ index, still }: Pick<DotProps, 'index' | 'still'>) {
  const wave = useCycle({ duration: CYCLE_MS, delay: index * STAGGER_MS, still });
  const opacity = still
    ? STILL_DOT_OPACITY
    : wave.interpolate({ inputRange: [0, PEAK, 1], outputRange: [0.25, 1, 0.25] });
  const translateY = still
    ? 0
    : wave.interpolate({ inputRange: [0, PEAK, 1], outputRange: [0, -3, 0] });
  return { opacity, translateY };
}
