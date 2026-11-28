import type { TickTone } from '@ab/shared';
import type { ViewStyle } from 'react-native';
import type { Palette } from '../../../theme';
import type { DeliveryTicksProps } from './DeliveryTicks.types';

// Read is the blue `read`, the rest the grey `tick`; failed uses the saffron your-turn tone.
export const INK: Record<TickTone, keyof Palette> = { muted: 'tick', read: 'read', act: 'act' };

export const ROW: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 2 };

export const HIDDEN = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

export const plain = (p: DeliveryTicksProps): boolean => !p.times && !p.onPress && !p.onHold;

/** The long press: the caller's own, else the times' toggle when there are times. */
export const holdOf = (p: DeliveryTicksProps): (() => void) | undefined =>
  p.onHold ?? (p.times ? p.onLongPress : undefined);
