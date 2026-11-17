import { isUnavailableQuote, type MessageQuote, quoteIcon, type ReplyQuote } from '@ab/shared';
import { useState } from 'react';
import { Image } from 'react-native';
import { shape, QuoteCard, QuoteUnavailable } from '@ab/mobile-kit';
import { useBubbleChatActions } from '@/inbox/thread/hooks/chat-actions';
import { useQuoteThumb } from '@/inbox/messages/hooks/quote-thumb';
import { quoteSender, quoteText } from '@/inbox/messages/hooks/quote-text';

export interface QuoteBlockProps {
  quote: ReplyQuote;
  /** The chat's number: a quoted photo's or PDF's thumb (absent: the icon only). */
  phone?: string;
  /** Scrolls to the original and lights it up (MessageList); absent, the block is plain. */
  onJump?: (id: string) => void;
}

/** A quoted photo's or PDF's thumb at the inline-end, as WhatsApp; nothing when it cannot load. */
function QuoteThumb({ quote, phone }: { quote: MessageQuote; phone: string }) {
  const uri = useQuoteThumb(quote, phone);
  const [broken, setBroken] = useState<string | null>(null);
  if (!uri || broken === uri) return null;
  return (
    <Image
      testID={`quote-thumb-${quote.id}`}
      source={{ uri }}
      onError={() => setBroken(uri)}
      style={{ width: 40, height: 40, borderRadius: shape.radius.xs }}
    />
  );
}

/**
 * The message a bubble answers, on top of it as WhatsApp draws it (the kit's QuoteCard): the chat's
 * sender name, a photo's or PDF's thumb at the end (signed by the staff API).
 */
export function QuoteBlock({ quote, phone, onJump }: QuoteBlockProps) {
  const { threadName } = useBubbleChatActions();
  if (isUnavailableQuote(quote)) return <QuoteUnavailable />;
  return (
    <QuoteCard
      id={quote.id}
      sender={quoteSender(quote, threadName)}
      text={quoteText(quote)}
      icon={quoteIcon(quote)}
      thumb={phone ? <QuoteThumb quote={quote} phone={phone} /> : null}
      onJump={onJump}
    />
  );
}
