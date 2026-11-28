import { closingSpec } from '@ab/web-kit/classroom/closing/closing-kinds';
import type { RoomClosingProps } from './RoomClosing.types';

/** The screen's icon, a rejoin only where rejoining can work, and whether one is under way. */
export function closingView({ kind, variant, onRejoin, rejoin }: RoomClosingProps) {
  const spec = closingSpec(kind, variant);
  return {
    icon: spec.icon,
    again: spec.rejoin ? onRejoin : undefined,
    busy: rejoin?.busy ?? false,
  };
}
