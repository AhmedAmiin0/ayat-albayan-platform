import { useId } from 'react';
import type { Props, SpeedKey } from './PlayerButtons.types';
import { SPEED_OF } from './player-buttons.helpers';

export function usePlayerButtons({ controls, speed }: Pick<Props, 'controls' | 'speed'>) {
  const name = `speed-${useId()}`;
  const back = () => controls.skip(-1);
  const forward = () => controls.skip(1);
  const onSpeed = (v: SpeedKey) => controls.setSpeed(SPEED_OF[v]);
  return { name, value: `${speed}` as const, back, forward, onSpeed };
}
