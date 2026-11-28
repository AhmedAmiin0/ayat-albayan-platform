import { useCycle } from '../../motion/use-cycle';
import type { ConnectingRingProps } from './ConnectingRing.types';

const TURN_MS = 1600;
export function useConnectingRing({ still }: Pick<ConnectingRingProps, 'still'>) {
  const turn = useCycle({ duration: TURN_MS, still });
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return { rotate };
}
