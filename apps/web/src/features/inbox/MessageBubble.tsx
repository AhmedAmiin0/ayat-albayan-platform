import { replyNote, type MessageView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { cn } from '@/lib/utils';
import { DeliveryTicks } from './DeliveryTicks';
import { clockText, fullTime, templateLine } from './format';
import { LineBadge } from './LineBadge';
import { splitLinks } from './linkify';
import { MessageActions } from './MessageActions';
import { MessageMedia } from './MessageMedia';
import { useInboxMode } from './mode';
import { RatingChip } from './RatingChip';
import { canRetry, canSendByHand, deliveryTitle, isHandedOff, outboundNotes } from './message-notes';

export interface MessageBubbleProps {
  /** `sent_by_teacher_name`: the teacher who sent it from the academy number; null = the academy. */
  message: MessageView;
  /** Its template is not approved yet, so the sender leaves it queued. */
  waitingTemplate: boolean;
  now: Date;
}

/** The text with its http(s) links clickable (W11). */
function Body({ text }: { text: string }) {
  return (
    <p dir="auto" className="whitespace-pre-wrap break-words">
      {splitLinks(text).map((part, i) =>
        part.href ? (
          <a key={i} href={part.href} target="_blank" rel="noopener noreferrer" dir="ltr" className="break-all text-lapis underline underline-offset-4">
            {part.text}
          </a>
        ) : (
          part.text
        ),
      )}
    </p>
  );
}

/** What a quick reply did (R-SCH-03): «اتأكدت حلقة …» only when its lesson is confirmed now. */
function ReplyLine({ message: m }: { message: MessageView }) {
  const note = replyNote(m, locale);
  if (!note) return null;
  return <p className="mt-1 text-xs font-semibold text-ink-2">{t.inbox.quickReply[note.key].replace('{when}', note.when ?? '')}</p>;
}

/** What was said: the template's name, the media, the text, and what a quick reply did. */
function Content({ message: m }: { message: MessageView }) {
  const empty = !m.body && !m.media_mime && !m.template_key;
  return (
    <>
      {m.template_key && <p className="mb-1 text-2xs font-semibold text-ink-3">{templateLine(m.template_key)}</p>}
      {(m.media_mime || m.media_url) && <MessageMedia message={m} />}
      {m.body && <Body text={m.body} />}
      {empty && <p className="text-xs text-ink-3">{t.inbox.media.other}</p>}
      <ReplyLine message={m} />
      <RatingChip message={m} />
    </>
  );
}

/**
 * One message (R-MSG-05). Theirs at the inline-start, ours at the end; the clock time (the log's day
 * separators carry the day, the tooltip the full date), and on ours WhatsApp-style delivery ticks
 * right after the time (DeliveryTicks), the reason when it failed and what to do next.
 */
export function MessageBubble({ message: m, waitingTemplate, now }: MessageBubbleProps) {
  const outbound = m.direction === 'outbound';
  const notes = outboundNotes(m, { waitingTemplate, now });
  const admin = useInboxMode() === 'admin';

  return (
    <li className={cn('flex', outbound ? 'justify-end' : 'justify-start')}>
      <article
        className={cn(
          'max-w-[min(85%,560px)] rounded-lg px-3.5 py-2.5 text-sm',
          // Below 900px (the full-screen chat on a sunk ground): ours mint with its tail at the end, theirs white.
          outbound
            ? 'bg-sunk max-shell:rounded-ee-sm max-shell:border max-shell:border-lapis/25 max-shell:bg-lapis-wash'
            : 'border border-rule bg-raised max-shell:rounded-es-sm',
          m.status === 'failed' && 'shadow-[inset_0_0_0_1px_var(--color-act)]',
        )}
      >
        <Content message={m} />
        {m.sent_by_teacher_name && (
          <p className="mt-1 text-2xs font-semibold text-ink-2">{t.inbox.sentBy.replace('{name}', m.sent_by_teacher_name)}</p>
        )}
        <footer className="mt-1.5 flex flex-wrap items-center justify-end gap-2 text-2xs text-ink-3">
          <LineBadge line={m.line} />
          <time dateTime={m.created_at} title={fullTime(m.created_at)} className="tabular-nums">
            {clockText(m.created_at)}
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
    </li>
  );
}
