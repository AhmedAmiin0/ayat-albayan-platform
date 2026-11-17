import type { ChannelMessageView } from '@ab/shared';
import { BubbleMeta } from '../../chat-ui/bubble/BubbleMeta';
import { BubbleShell } from '../../chat-ui/bubble/BubbleShell';
import { SwipeReply } from '../../chat-ui/swipe/SwipeReply';
import { useClockCycle } from '../../lib/clock/clock-store';
import { AttachmentBody } from '../attach/AttachmentBody';
import { BubbleContent } from './BubbleContent';
import { metaText, ticksOf } from './bubble-meta';
import { ChannelQuote } from './ChannelQuote';
import { SenderLine } from './SenderLine';

export interface ChannelBubbleProps {
  message: ChannelMessageView;
  tz: string;
  /** The thread's clock (useNow): today's messages show only their time. */
  now: Date;
  /** The message's menu (reply, edit, delete…); absent → a plain bubble. */
  onLongPress?: () => void;
  /** Swipe to answer it (write mode only). */
  onReply?: () => void;
  /** A long press on my ticks: who has read it. */
  onReads?: () => void;
  /** A tap on its quote: go to the original. */
  onJump?: (id: string) => void;
  /** Just jumped to: a brand edge for a moment. */
  highlight?: boolean;
}

/**
 * One message (ChatX boards): mine at the inline end in the brand wash with its ticks, theirs at
 * the start with the sender's name and role; the quote it answers, its file, its words, the time.
 */
export function ChannelBubble(p: ChannelBubbleProps) {
  const { message: m } = p;
  const cycle = useClockCycle();
  const status = ticksOf(m);
  const ticks = status ? { status, onHold: p.onReads } : undefined;
  return (
    <SwipeReply onReply={p.onReply}>
      <BubbleShell
        ours={m.mine}
        highlight={p.highlight}
        testID={`channel-bubble-${m.id}`}
        onLongPress={p.onLongPress}
      >
        {m.mine ? null : <SenderLine name={m.sender_name} role={m.sender_role} />}
        {m.reply_to && !m.deleted ? <ChannelQuote reply={m.reply_to} onJump={p.onJump} /> : null}
        {m.deleted ? null : <AttachmentBody message={m} />}
        <BubbleContent message={m} />
        <BubbleMeta time={metaText(m, { tz: p.tz, now: p.now, cycle })} ticks={ticks} />
      </BubbleShell>
    </SwipeReply>
  );
}
