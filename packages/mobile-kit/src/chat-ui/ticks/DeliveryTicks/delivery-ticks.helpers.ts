import { bubbleWord, type TickTone } from '@ab/shared';
import type { ViewStyle } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
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

/** A send that may have gone (docs/19) is not called unsent. */
const statusWord = ({ status, errorCode }: DeliveryTicksProps): string =>
  bubbleWord(status, errorCode) === 'unconfirmed'
    ? t.messages.unconfirmedTick
    : t.enums.messageStatus[status];

const named = (p: DeliveryTicksProps): string =>
  p.times ? `${statusWord(p)} · ${p.times}` : statusWord(p);

export const labelOf = (p: DeliveryTicksProps): string =>
  p.actionLabel ? `${named(p)} — ${p.actionLabel}` : named(p);
