import { bubbleWord, messageTicks, TICK_PATHS, tickTone, type TickTone } from '@ab/shared';
import type { MessageStatus } from '@ab/catalog';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';

// Failed uses saffron, the same tone as its row word and the bubble's ring.
const INK: Record<TickTone, string> = { muted: 'text-tick', read: 'text-read', act: 'text-act' };

export interface DeliveryTicksProps {
  status: MessageStatus;
  times?: string;
  /** In a thread row the row's own failed word already says it, so the ticks carry none. */
  inList?: boolean;
  /** A send that may have gone reads as unconfirmed rather than failed. */
  errorCode?: string | null;
  className?: string;
}

// Text needs AA contrast, unlike the glyph.
const WORD = {
  failed: { text: t.enums.messageStatus.failed, ink: '' },
  unconfirmed: { text: t.messages.unconfirmedTick, ink: '' },
  manual: { text: t.messages.manualTick, ink: 'text-ink-3' },
} as const;

/** Delivered vs read differ by colour only (docs/07 principle 3 carve-out). */
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
