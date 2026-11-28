import type { ReactNode } from 'react';
import type { Palette } from '../../../theme';
import type { DeliveryTicksProps } from '../../ticks/DeliveryTicks';

export type Ticks = Pick<
  DeliveryTicksProps,
  'status' | 'times' | 'onPress' | 'actionLabel' | 'onHold' | 'errorCode'
>;

export interface BubbleMetaProps {
  /** Already formatted, possibly with the edited mark before it. */
  time: string;
  /** Ours only: the delivery ticks; a long press on them shows `times` on a line of their own. */
  ticks?: Ticks;
  /** A plain word at the row's start (the line it came in on). */
  lead?: string | null;
  /** A mark right before the time (a correction's). */
  mark?: ReactNode;
  /** The small print's ink: ink-2 (the staff inbox) unless given (the channel's ink-3). */
  ink?: keyof Palette;
}
