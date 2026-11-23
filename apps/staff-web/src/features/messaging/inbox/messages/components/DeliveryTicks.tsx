import { bubbleWord, messageTicks, TICK_PATHS, tickTone, type TickTone } from '@ab/shared';
import type { MessageStatus } from '@ab/catalog';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';

// Read is the WhatsApp-like blue (--read), the rest the tick grey (--tick); failed is saffron, the
// «دورك» tone of its row word and the bubble's ring.
const INK: Record<TickTone, string> = { muted: 'text-tick', read: 'text-read', act: 'text-act' };

export interface DeliveryTicksProps {
  status: MessageStatus;
  /** «أُرسلت … · وصلت … · قُرئت …» (deliveryTitle): the tooltip; else the status word. */
  times?: string;
  /** In a thread row: its own «لم تُرسل» already says failed, so the ticks carry no word for it. */
  inList?: boolean;
  /** The row's error_code: a send that may have gone reads «لم يتأكد الإرسال بعد» (bubbleWord). */
  errorCode?: string | null;
  className?: string;
}

// Text needs AA, unlike the glyph: «يدويًا» in the muted text ink, «لم تُرسل» inherits saffron.
const WORD = {
  failed: { text: t.enums.messageStatus.failed, ink: '' },
  unconfirmed: { text: t.messages.unconfirmedTick, ink: '' },
  manual: { text: t.messages.manualTick, ink: 'text-ink-3' },
} as const;

/**
 * WhatsApp-style ticks on OUR message (packages/shared ticks.ts): an image named by the status word,
 * the times on hover. As in WhatsApp, delivered vs read is the same two ticks told apart by colour
 * only (docs/07 principle 3 carve-out): the word goes to assistive tech and the hover title. Failed
 * has its own «!» and says «لم تُرسل» (as on mobile), or «لم يتأكد الإرسال بعد» when the send may
 * have gone (bubbleWord, docs/19); sent by hand keeps its short word «يدويًا».
 */
export function DeliveryTicks(props: DeliveryTicksProps) {
  const { status, times, inList = false, className, errorCode } = props;
  const kind = messageTicks(status);
  const shown = bubbleWord(status, errorCode, inList);
  const unconfirmed = bubbleWord(status, errorCode) === 'unconfirmed';
  const word = unconfirmed ? WORD.unconfirmed.text : t.enums.messageStatus[status];
  return (
    <span
      role="img"
      aria-label={word}
      title={times || word}
      data-ticks={kind}
      className={cn('inline-flex shrink-0 items-center gap-0.5', INK[tickTone(kind)], className)}
    >
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        focusable="false"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 shrink-0"
      >
        <path d={TICK_PATHS[kind]} />
      </svg>
      {shown && (
        <span aria-hidden="true" className={cn('text-2xs font-semibold', WORD[shown].ink)}>
          {WORD[shown].text}
        </span>
      )}
    </span>
  );
}
