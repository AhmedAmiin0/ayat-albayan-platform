import { ticksOf } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import { BubbleMeta } from '../../../chat-ui/bubble/BubbleMeta';
import { BubbleShell } from '../../../chat-ui/bubble/BubbleShell';
import { SwipeReply } from '../../../chat-ui/swipe/SwipeReply';
import { useClockCycle } from '../../../lib/clock/clock-store';
import { AttachmentBody } from '../../attach/AttachmentBody';
import { BubbleContent } from '../BubbleContent';
import { bubbleLabel, speaksAsOne } from '../bubble-label';
import { metaText } from '../bubble-meta';
import { ChannelQuote } from '../ChannelQuote';
import { menuA11y } from '../menu-a11y';
import { SenderLine } from '../SenderLine';

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
  /** Just jumped to, or held for its menu: a brand edge. */
  highlight?: boolean;
  /** The same sender again: no name line, no tail corner. */
  followUp?: boolean;
}

/** One stop for a screen reader (a plain text with a menu): its label, the hint, the action. */
const shellA11y = (p: ChannelBubbleProps, meta: string) =>
  p.onLongPress && speaksAsOne(p.message)
    ? { accessibilityLabel: bubbleLabel(p.message, meta), ...menuA11y(p.onLongPress) }
    : {};

/**
 * One message (ChatX boards): mine at the inline end in the brand wash with its ticks, theirs at
 * the start with the sender's name and role; the quote it answers, its file, its words, the time.
 */
export function ChannelBubble(p: ChannelBubbleProps) {
  const { message: m } = p;
  const cycle = useClockCycle();
  const status = ticksOf(m);
  const ticks = status ? { status, onHold: p.onReads } : undefined;
  const meta = metaText(m, { tz: p.tz, now: p.now, cycle });
  const named = !m.mine && !p.followUp;
  return (
    <SwipeReply onReply={p.onReply}>
      <BubbleShell
        ours={m.mine}
        highlight={p.highlight}
        tail={!p.followUp}
        testID={`channel-bubble-${m.id}`}
        onLongPress={p.onLongPress}
        {...shellA11y(p, meta)}
      >
        {named ? <SenderLine name={m.sender_name} role={m.sender_role} /> : null}
        {m.reply_to && !m.deleted ? <ChannelQuote reply={m.reply_to} onJump={p.onJump} /> : null}
        {m.deleted ? null : <AttachmentBody message={m} onLongPress={p.onLongPress} />}
        <BubbleContent message={m} />
        <BubbleMeta time={meta} ticks={ticks} ink="ink3" />
      </BubbleShell>
    </SwipeReply>
  );
}
