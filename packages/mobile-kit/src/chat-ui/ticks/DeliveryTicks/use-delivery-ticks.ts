import { bubbleWord, messageTicks, tickTone } from '@ab/shared';
import { useTheme } from '../../../theme';
import type { DeliveryTicksProps } from './DeliveryTicks.types';
import { INK, labelOf, ROW } from './delivery-ticks.helpers';

export function useDeliveryTicks(p: DeliveryTicksProps) {
  const { color } = useTheme();
  const kind = messageTicks(p.status);
  const glyph = {
    kind,
    ink: color[INK[tickTone(kind)]],
    word: bubbleWord(p.status, p.errorCode, p.inList),
  };
  const a11y = {
    accessible: true,
    accessibilityRole: p.onPress ? ('button' as const) : ('image' as const),
    accessibilityLabel: labelOf(p),
    testID: `ticks-${kind}`,
    style: ROW,
  };
  return { kind, glyph, a11y };
}
