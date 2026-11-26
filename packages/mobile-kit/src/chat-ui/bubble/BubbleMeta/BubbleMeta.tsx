import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import type { Palette } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import { DeliveryTicks, type DeliveryTicksProps } from '../../ticks/DeliveryTicks';
import { useSmallText } from '../use-small-text';

type Ticks = Pick<
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

const ROW = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
  gap: 8,
} as const;

/**
 * A bubble's meta row, as WhatsApp: at the inline-end, the ticks right after the time. A long press
 * on the ticks shows their times under the row, so an older message's long times wrap in the
 * bubble.
 */
export function BubbleMeta({ time, ticks, lead, mark, ink }: BubbleMetaProps) {
  const small = useSmallText(ink);
  const [open, setOpen] = useState(false);
  const times = ticks?.times ?? '';
  return (
    <>
      <View style={ROW}>
        {lead ? <AppText style={small}>{lead}</AppText> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {mark}
          <AppText style={small}>{time}</AppText>
          {ticks ? <DeliveryTicks {...ticks} onLongPress={() => setOpen((v) => !v)} /> : null}
        </View>
      </View>
      {open && times ? (
        <AppText testID="ticks-times" style={{ ...small, alignSelf: 'flex-end' }}>
          {times}
        </AppText>
      ) : null}
    </>
  );
}
