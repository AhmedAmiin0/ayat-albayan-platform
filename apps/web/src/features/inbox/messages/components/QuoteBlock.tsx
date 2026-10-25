import type { MessageQuote } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { useChatActions } from '../../chat-actions';
import { jumpToMessage } from '../lib/jump-to-message';
import { quoteSender, quoteText } from '../lib/quote';

export interface QuoteBlockProps {
  quote: MessageQuote;
  /** Sits in our bubble (mint on phones): a raised ground instead of the sunk one. */
  outbound: boolean;
}

/**
 * The message a bubble answers (owner 2026-10-25), WhatsApp-style at its top: a green bar at the
 * inline-start, who wrote it and its first line (or the file's kind). A click scrolls the original
 * into view and highlights it; one older than the loaded pages is said in a polite toast.
 */
export function QuoteBlock({ quote, outbound }: QuoteBlockProps) {
  const actions = useChatActions();
  return (
    <button
      type="button"
      title={t.inbox.reply.jump}
      onClick={() => {
        if (!jumpToMessage(quote.id)) actions.notLoaded();
      }}
      className={cn(
        'mb-1.5 block w-full min-w-0 rounded-md border-s-[3px] border-lapis px-2.5 py-1 text-start text-xs transition-colors duration-[120ms] hover:bg-lapis-wash',
        outbound ? 'bg-raised' : 'bg-sunk',
      )}
    >
      <span className="sr-only">{t.inbox.reply.jump}</span>
      <span className="block truncate font-semibold text-lapis" dir="auto">
        {quoteSender(quote, actions.chat)}
      </span>
      <span className="block truncate text-ink-2" dir="auto">
        {quoteText(quote)}
      </span>
    </button>
  );
}
