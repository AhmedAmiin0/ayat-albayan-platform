import type { MessageView } from '@ab/shared';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { BubbleActions, useHasBubbleActions } from './BubbleActions';
import { DeliveryTicks } from './DeliveryTicks';
import { clockText, fullTime } from './format';
import { bubbleId } from './jump-to-message';
import { LineBadge } from './LineBadge';
import { MessageActions } from './MessageActions';
import { Content, SenderLine } from './MessageContent';
import { useInboxMode } from './mode';
import { canRetry, canSendByHand, deliveryTitle, isHandedOff, outboundNotes } from './message-notes';

export interface MessageBubbleProps {
  message: MessageView;
  /** Its template is not approved yet, so the sender leaves it queued. */
  waitingTemplate: boolean;
  now: Date;
}

/**
 * One message (R-MSG-05). Theirs at the inline-start, ours at the end; the clock time (the log's day
 * separators carry the day, the tooltip the full date), and on ours WhatsApp-style delivery ticks
 * right after the time (DeliveryTicks), the reason when it failed and what to do next. In a chat she
 * can write in, «رد» / «إعادة توجيه» beside it (BubbleActions; also a right-click), and an id a
 * quote's click scrolls to (jump-to-message), highlighted for a moment.
 */
export function MessageBubble({ message: m, waitingTemplate, now }: MessageBubbleProps) {
  const outbound = m.direction === 'outbound';
  const notes = outboundNotes(m, { waitingTemplate, now });
  const admin = useInboxMode() === 'admin';
  const [menu, setMenu] = useState(false);
  const acts = useHasBubbleActions(m);
  const actions = <BubbleActions message={m} menu={menu} onMenu={setMenu} />;

  return (
    <li
      id={bubbleId(m.id)}
      data-message-id={m.id}
      tabIndex={-1}
      className={cn(
        'group flex items-start gap-1 rounded-lg transition-colors duration-500 data-[flash]:bg-lapis-wash motion-reduce:transition-none',
        outbound ? 'justify-end' : 'justify-start',
      )}
    >
      {outbound && actions}
      <article
        onContextMenu={
          acts
            ? (e) => {
                e.preventDefault();
                setMenu(true);
              }
            : undefined
        }
        className={cn(
          'min-w-0 max-w-[min(85%,560px)] rounded-lg px-3.5 py-2.5 text-sm',
          // Below 900px (the full-screen chat on a sunk ground): ours mint with its tail at the end, theirs white.
          outbound
            ? 'bg-sunk max-shell:rounded-ee-sm max-shell:border max-shell:border-lapis/25 max-shell:bg-lapis-wash'
            : 'border border-rule bg-raised max-shell:rounded-es-sm',
          m.status === 'failed' && 'shadow-[inset_0_0_0_1px_var(--color-act)]',
        )}
      >
        <Content message={m} />
        <SenderLine message={m} />
        <footer className="mt-1.5 flex flex-wrap items-center justify-end gap-2 text-2xs text-ink-3">
          <LineBadge line={m.line} />
          <time dateTime={m.created_at} title={fullTime(m.created_at)} className="tabular-nums">
            {/* The day separators are hidden from screen readers: they hear the full date here. */}
            <span aria-hidden="true">{clockText(m.created_at)}</span>
            <span className="sr-only">{fullTime(m.created_at)}</span>
          </time>
          {outbound && <DeliveryTicks status={m.status} times={deliveryTitle(m)} />}
        </footer>
        {notes.map((note) => (
          <p key={note} className="mt-1 text-2xs text-ink-2">
            {note}
          </p>
        ))}
        {admin && (canRetry(m) || canSendByHand(m) || isHandedOff(m)) && <MessageActions message={m} />}
      </article>
      {!outbound && actions}
    </li>
  );
}
