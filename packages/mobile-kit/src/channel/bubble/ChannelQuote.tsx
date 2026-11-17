import type { ChannelReplyView } from '@ab/shared';
import { QuoteCard } from '../../chat-ui/quote/QuoteCard';
import { FILE_ICON, quoteSender, quoteText } from './quote-text';

interface ChannelQuoteProps {
  reply: ChannelReplyView;
  /** Goes to the original when it is loaded. */
  onJump?: (id: string) => void;
}

/** The message a bubble answers, on top of it (the kit's QuoteCard). */
export function ChannelQuote({ reply, onJump }: ChannelQuoteProps) {
  return (
    <QuoteCard
      id={reply.id}
      sender={quoteSender(reply)}
      text={quoteText(reply)}
      icon={reply.deleted ? null : FILE_ICON[reply.kind]}
      onJump={onJump}
    />
  );
}
