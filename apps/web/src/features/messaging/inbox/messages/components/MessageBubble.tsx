import type { MessageView } from '@ab/shared';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { BubbleActions, useHasBubbleActions } from './BubbleActions';
import { DeliveryTicks } from './DeliveryTicks';
import { ReactionPill } from '@/features/messaging/inbox/messages/reactions/ReactionPill';
import { clockText, fullTime } from '@/features/messaging/inbox/format';
import { BUBBLE_ROW } from '@/features/messaging/inbox/messages/lib/bubble-side';
import { bubbleId } from '@/features/messaging/inbox/messages/lib/jump-to-message';
import { LineBadge } from '@/features/messaging/inbox/shared/LineBadge';
import { MessageActions } from './MessageActions';
import { Content, SenderLine } from './MessageContent';
import { useInboxMode } from '@/features/messaging/inbox/shared/mode';
import { canRetry, canSendByHand, deliveryTitle, isHandedOff, outboundNotes } from '@/features/messaging/inbox/messages/lib/message-notes';
import { useClock } from '@/lib/clock';
import { TemplateButtons } from '@/features/messaging/inbox/messages/template/TemplateButtons';
import { stickerOrGif } from '@/features/messaging/inbox/messages/sticker/StickerMedia';

/** Some of the bubble's text is selected with the mouse. */
function selectedIn(el: HTMLElement): boolean {
  const sel = window.getSelection();
  return Boolean(sel && !sel.isCollapsed && sel.toString().trim() && el.contains(sel.anchorNode));
}

export interface MessageBubbleProps {
  message: MessageView;
  /** Its template is not approved yet, so the sender leaves it queued. */
  waitingTemplate: boolean;
  now: Date;
}

/**
 * One message (R-MSG-05). As WhatsApp (owner 2026-10-26): ours on the right, theirs on the left, in
 * Arabic and English alike (BUBBLE_ROW), the text inside keeping its own direction; the clock time (the log's day
 * separators carry the day, the tooltip the full date), and on ours WhatsApp-style delivery ticks
 * right after the time (DeliveryTicks), the reason when it failed and what to do next. In a chat she
 * can write in, «رد» / «إعادة توجيه» beside it (BubbleActions; also a right-click), and an id a
 * quote's click scrolls to (jump-to-message), highlighted for a moment.
 */
export function MessageBubble({ message: m, waitingTemplate, now }: MessageBubbleProps) {
  const outbound = m.direction === 'outbound';
  const clock = useClock();
  const notes = outboundNotes(m, { waitingTemplate, now, clock });
  const mode = useInboxMode();
  const admin = mode === 'admin';
  // A sticker has no bubble around it, as WhatsApp (owner 2026-11-01); its time and ticks stay.
  const bare = stickerOrGif(m, mode === 'teacher') === 'sticker';
  const [menu, setMenu] = useState(false);
  const acts = useHasBubbleActions(m);
  const actions = <BubbleActions message={m} menu={menu} onMenu={setMenu} />;
  // A template's buttons (WhatsApp): attached right under the time, the rest below them.
  const rows = Boolean(m.template?.buttons.length);

  return (
    <li
      id={bubbleId(m.id)}
      data-message-id={m.id}
      tabIndex={-1}
      className={cn(
        'group flex items-start gap-1 rounded-lg transition-colors duration-500 data-[flash]:bg-lapis-wash motion-reduce:transition-none',
        BUBBLE_ROW[outbound ? 'outbound' : 'inbound'],
      )}
    >
      {outbound && actions}
      <article
        onContextMenu={
          acts
            ? (e) => {
                // Text selected in this bubble (partial copy): the browser's own menu copies it.
                if (selectedIn(e.currentTarget)) return;
                e.preventDefault();
                setMenu(true);
              }
            : undefined
        }
        className={cn(
          'min-w-0 max-w-[min(85%,560px)] rounded-lg px-3.5 py-2.5 text-sm',
          // WhatsApp's buttons span the bubble: a template with buttons is never a sliver.
          rows && 'min-w-[min(85%,260px)] overflow-hidden pb-0',
          // Below 900px (the full-screen chat on a sunk ground): ours mint, theirs white, each with its
          // sharp tail corner at the top of its screen edge.
          outbound
            ? 'bg-sunk max-shell:rounded-tr-sm max-shell:border max-shell:border-lapis/25 max-shell:bg-lapis-wash'
            : 'border border-rule bg-raised max-shell:rounded-tl-sm',
          bare && 'border-0 bg-transparent px-0 max-shell:border-0 max-shell:bg-transparent',
          m.status === 'failed' && 'shadow-[inset_0_0_0_1px_var(--color-act)]',
        )}
      >
        <Content message={m} />
        <SenderLine message={m} />
        <footer className="mt-1.5 flex flex-wrap items-center justify-end gap-2 text-2xs text-ink-3">
          <LineBadge line={m.line} />
          <time dateTime={m.created_at} title={fullTime(m.created_at, clock)} className="tabular-nums">
            {/* The day separators are hidden from screen readers: they hear the full date here. */}
            <span aria-hidden="true">{clockText(m.created_at, clock)}</span>
            <span className="sr-only">{fullTime(m.created_at, clock)}</span>
          </time>
          {outbound && <DeliveryTicks status={m.status} times={deliveryTitle(m, clock)} />}
        </footer>
        {m.template && <TemplateButtons buttons={m.template.buttons} />}
        <div className={cn(rows && 'pb-2.5 empty:hidden')}>
          {notes.map((note) => (
            <p key={note} className="mt-1 text-2xs text-ink-2">
              {note}
            </p>
          ))}
          {admin && (canRetry(m) || canSendByHand(m) || isHandedOff(m)) && <MessageActions message={m} />}
          <ReactionPill message={m} outbound={outbound} />
        </div>
      </article>
      {!outbound && actions}
    </li>
  );
}
