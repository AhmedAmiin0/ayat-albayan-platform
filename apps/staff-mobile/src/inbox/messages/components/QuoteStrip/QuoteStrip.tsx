import { quoteIcon } from '@ab/shared';
import { QuoteBar } from '@ab/mobile-kit';
import { useChatActions } from '@/inbox/thread/hooks/chat-actions';
import { quoteOf, quoteSender, quoteText } from '@/inbox/messages/hooks/quote-text';

/**
 * Over the composer while she answers a message (the kit's QuoteBar): shown only while free text
 * can go out; ✕ stops answering it.
 */
export function QuoteStrip() {
  const { reply, setReply, threadName } = useChatActions();
  if (!reply) return null;
  const quote = quoteOf(reply);
  return (
    <QuoteBar
      sender={quoteSender(quote, threadName)}
      text={quoteText(quote)}
      icon={quoteIcon(quote)}
      onCancel={() => setReply(null)}
    />
  );
}
