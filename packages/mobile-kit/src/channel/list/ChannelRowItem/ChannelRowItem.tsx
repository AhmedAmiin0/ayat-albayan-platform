import {
  menuOffers,
  offersAny,
  type ChannelAudience,
  type ChannelRow,
  type MenuOffers,
} from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import { View } from 'react-native';
import { DayChip } from '../../../chat-ui/days/DayChip';
import { ChannelBubble } from '../../bubble/ChannelBubble';
import { UnreadBand } from '../UnreadBand';

/** What a row's gestures open in the thread. */
export interface RowActions {
  onHold: (message: ChannelMessageView, offers: MenuOffers) => void;
  onReply: (message: ChannelMessageView) => void;
  onReads: (message: ChannelMessageView) => void;
  onJump: (id: string) => void;
}

interface ChannelRowItemProps {
  row: ChannelRow;
  audience: ChannelAudience;
  mode: 'write' | 'read' | 'closed';
  clock: { tz: string; now: Date };
  /** Jumped to, or held for its menu: its brand edge. */
  lit: boolean;
  actions: RowActions;
}

/**
 * One row: its day chip, the unread band, the bubble with the gestures its offers allow, the air
 * over it by the ChatX rhythm (4pt same side, 8pt a side change, 0 under a chip).
 */
export function ChannelRowItem({ row, audience, mode, clock, lit, actions }: ChannelRowItemProps) {
  const m = row.message;
  const offers = menuOffers({ audience, mode, message: m, now: clock.now });
  return (
    <View style={{ paddingTop: row.space }}>
      {row.opensDay ? <DayChip label={row.dayText} /> : null}
      {row.unread === null ? null : <UnreadBand count={row.unread} />}
      <ChannelBubble
        message={m}
        tz={clock.tz}
        now={clock.now}
        highlight={lit}
        followUp={row.followUp}
        onLongPress={offersAny(offers) ? () => actions.onHold(m, offers) : undefined}
        onReply={offers.reply ? () => actions.onReply(m) : undefined}
        onReads={offers.reads ? () => actions.onReads(m) : undefined}
        onJump={actions.onJump}
      />
    </View>
  );
}
