import { BubbleMeta } from '../../../chat-ui/bubble/BubbleMeta';
import { BubbleShell } from '../../../chat-ui/bubble/BubbleShell';
import { SwipeReply } from '../../../chat-ui/swipe/SwipeReply';
import { AttachmentBody } from '../../attach/AttachmentBody';
import { BubbleContent } from '../BubbleContent';
import { ChannelQuote } from '../ChannelQuote';
import { SenderLine } from '../SenderLine';
import type { ChannelBubbleProps } from './ChannelBubble.types';
import { shellA11y } from './channel-bubble.helpers';
import { useChannelBubble } from './use-channel-bubble';

/**
 * One message (ChatX boards): mine at the inline end in the brand wash with its ticks, theirs at
 * the start with the sender's name and role; the quote it answers, its file, its words, the time.
 */
export function ChannelBubble(p: ChannelBubbleProps) {
  const { m, ticks, meta, named } = useChannelBubble(p);
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
