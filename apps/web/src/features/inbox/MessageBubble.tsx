import { messageStatusStyle, replyNote, type MessageView } from '@ab/shared';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { cn } from '@/lib/utils';
import { fullTime, mediaKind, stampText, templateLine } from './format';
import { MessageActions } from './MessageActions';
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

function Media({ message: m }: { message: MessageView }) {
  const kind = t.inbox.media[mediaKind(m.media_mime)];
  if (!m.media_url) {
    return (
      <p className="text-xs font-semibold text-ink-2">
        {kind} <span className="font-normal text-ink-3">· {t.inbox.mediaNotDownloaded}</span>
      </p>
    );
  }
  return (
    <a href={m.media_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-lapis underline underline-offset-4">
      {t.inbox.openMedia.replace('{kind}', kind)}
    </a>
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
      {(m.media_mime || m.media_url) && <Media message={m} />}
      {m.body && (
        <p dir="auto" className="whitespace-pre-wrap break-words">
          {m.body}
        </p>
      )}
      {empty && <p className="text-xs text-ink-3">{t.inbox.media.other}</p>}
      <ReplyLine message={m} />
      <RatingChip message={m} />
    </>
  );
}

/**
 * One message (R-MSG-05). Theirs at the inline-start, ours at the end; the time (with the day when
 * it is not today), and on ours the delivery status as glyph + word (docs/07 §1.3), the reason when
 * it failed and what to do next.
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
          // Phones (the full-screen chat on a sunk ground): ours mint with its tail at the end, theirs white.
          outbound
            ? 'bg-sunk max-sm:rounded-ee-sm max-sm:border max-sm:border-lapis/25 max-sm:bg-lapis-wash'
            : 'border border-rule bg-raised max-sm:rounded-es-sm',
          m.status === 'failed' && 'shadow-[inset_0_0_0_1px_var(--color-act)]',
        )}
      >
        <Content message={m} />
        {m.sent_by_teacher_name && (
          <p className="mt-1 text-2xs font-semibold text-ink-2">{t.inbox.sentBy.replace('{name}', m.sent_by_teacher_name)}</p>
        )}
        <footer className="mt-1.5 flex flex-wrap items-center justify-end gap-2 text-2xs text-ink-3">
          <time dateTime={m.created_at} title={fullTime(m.created_at)} className="tabular-nums">
            {stampText(m.created_at, now)}
          </time>
          {outbound && (
            <span title={deliveryTitle(m) || undefined}>
              <StatusChip size="sm" {...messageStatusStyle[m.status]} label={t.enums.messageStatus[m.status]} />
            </span>
          )}
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
