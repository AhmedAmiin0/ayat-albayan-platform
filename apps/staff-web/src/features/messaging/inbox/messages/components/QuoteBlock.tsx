import { isUnavailableQuote, quoteIcon, type MessageQuote, type ReplyQuote } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { useChatActions } from '@/features/messaging/inbox/shared/chat-actions';
import { jumpToMessage } from '@/features/messaging/inbox/messages/lib/jump-to-message';
import { quoteSender, quoteText } from '@/features/messaging/inbox/messages/lib/quote';
import { useQuoteThumb } from '@/features/messaging/inbox/messages/lib/use-quote-thumb';

export interface QuoteBlockProps {
  quote: ReplyQuote;
  /** Sits in our bubble (mint on phones): a raised ground instead of the sunk one. */
  outbound: boolean;
}

const BOX = 'mb-1.5 flex w-full min-w-0 items-center gap-2 rounded-md border-s-[3px] px-2.5 py-1 text-start text-xs';

/** A quoted photo's or PDF's thumb at the inline-end, as WhatsApp (once the bubble opened it). */
function QuoteThumb({ quote, phone }: { quote: MessageQuote; phone: string }) {
  const url = useQuoteThumb(quote, phone);
  const [broken, setBroken] = useState<string | null>(null);
  if (!url || broken === url) return null;
  return (
    <img
      src={url}
      alt=""
      onError={() => setBroken(url)}
      className="size-10 shrink-0 rounded-sm bg-raised object-cover object-top"
    />
  );
}

/** Who wrote it, its first line (a file's icon before it), the thumb; a click jumps to it. */
function QuotedMessage({ quote, outbound }: { quote: MessageQuote; outbound: boolean }) {
  const actions = useChatActions();
  const icon = quoteIcon(quote);
  return (
    <button
      type="button"
      title={t.inbox.reply.jump}
      onClick={() => {
        if (!jumpToMessage(quote.id)) actions.notLoaded();
      }}
      className={cn(
        BOX,
        'border-lapis transition-colors duration-[120ms] hover:bg-lapis-wash',
        outbound ? 'bg-raised' : 'bg-sunk',
      )}
    >
      <span className="sr-only">{t.inbox.reply.jump}</span>
      <span className="grid min-w-0 flex-1">
        <span className="truncate font-semibold text-lapis" dir="auto">
          {quoteSender(quote, actions.chat)}
        </span>
        <span className="truncate text-ink-2" dir="auto">
          {icon && <span aria-hidden="true">{`${icon} `}</span>}
          {quoteText(quote)}
        </span>
      </span>
      <QuoteThumb quote={quote} phone={actions.chat.phone} />
    </button>
  );
}

/**
 * The message a bubble answers (owner 2026-10-25, WhatsApp's look 2026-10-31), at its top: a bar
 * at the inline-start, who wrote it, its first line (a file's icon and kind) and a photo's or
 * PDF's thumb. A click scrolls the original into view and highlights it; one older than the loaded
 * pages is said in a polite toast. WhatsApp quoted a message we never stored: «رسالة غير متاحة»,
 * greyed, no click.
 */
export function QuoteBlock({ quote, outbound }: QuoteBlockProps) {
  if (!isUnavailableQuote(quote)) return <QuotedMessage quote={quote} outbound={outbound} />;
  return (
    <p className={cn(BOX, 'border-rule-strong bg-sunk text-ink-3')}>
      {t.inbox.reply.unavailable}
    </p>
  );
}
