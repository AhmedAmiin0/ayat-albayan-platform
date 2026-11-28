import { QuoteCard } from '../../../chat-ui/quote/QuoteCard';
import { QuoteGlyph } from '../QuoteGlyph';
import { quoteSender, quoteText } from '../quote-text';
import { ROLE_INK } from '../role-ink';
import type { ChannelQuoteProps } from './ChannelQuote.types';

/** The message a bubble answers, on top of it (the kit's QuoteCard) in its sender's role ink. */
export function ChannelQuote({ reply, onJump }: ChannelQuoteProps) {
  return (
    <QuoteCard
      id={reply.id}
      sender={quoteSender(reply)}
      text={quoteText(reply)}
      glyph={<QuoteGlyph kind={reply.kind} deleted={reply.deleted} />}
      tone={ROLE_INK[reply.sender_role]}
      onJump={onJump}
    />
  );
}
