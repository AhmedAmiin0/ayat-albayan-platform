import { messageStatusStyle, quickReplyIntent, type MessageView } from '@ab/shared';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { clockText, fullTime, mediaKind, templateLine } from './format';
import { MessageActions } from './MessageActions';
import { canRetry, canSendByHand, deliveryTitle, outboundNotes } from './message-notes';

export interface MessageBubbleProps {
  message: MessageView;
  /** Its template is not approved yet, so the sender leaves it queued. */
  waitingTemplate: boolean;
  now: Date;
}

function Media({ message: m }: { message: MessageView }) {
  const kind = t.inbox.media[mediaKind(m.media_mime)];
  if (!m.media_url) return <p className="text-xs font-semibold text-ink-2">{kind}</p>;
  return (
    <a href={m.media_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-lapis underline underline-offset-4">
      {t.inbox.openMedia.replace('{kind}', kind)}
    </a>
  );
}

/** What was said: the template's name, the media, the text, and what a tapped quick reply meant. */
function Content({ message: m }: { message: MessageView }) {
  // A tapped quick-reply button («تمام، هنحضر») is stored with its payload; name what it meant.
  const intent = m.direction === 'inbound' && m.interactive_payload ? quickReplyIntent(m.body ?? '') : null;
  const empty = !m.body && !m.media_mime && !m.template_key;
  return (
    <>
      {m.template_key && <p className="mb-1 text-2xs font-semibold text-ink-3">{templateLine(m.template_key)}</p>}
      {(m.media_mime || m.media_url) && <Media message={m} />}
      {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
      {empty && <p className="text-xs text-ink-3">{t.inbox.media.other}</p>}
      {intent && <p className="mt-1 text-xs font-semibold text-ink-2">{t.inbox.quickReply[intent]}</p>}
    </>
  );
}

/**
 * One message (R-MSG-05). Theirs at the inline-start, ours at the end; the time, and on ours the
 * delivery status as glyph + word (docs/07 §1.3), the reason when it failed and what to do next.
 */
export function MessageBubble({ message: m, waitingTemplate, now }: MessageBubbleProps) {
  const outbound = m.direction === 'outbound';
  const notes = outboundNotes(m, { waitingTemplate, now });

  return (
    <li className={cn('flex', outbound ? 'justify-end' : 'justify-start')}>
      <article
        className={cn(
          'max-w-[min(85%,560px)] rounded-lg px-3.5 py-2.5 text-sm',
          outbound ? 'bg-sunk' : 'border border-rule bg-raised',
          m.status === 'failed' && 'shadow-[inset_0_0_0_1px_var(--color-act)]',
        )}
      >
        <Content message={m} />
        <footer className="mt-1.5 flex flex-wrap items-center justify-end gap-2 text-2xs text-ink-3">
          <time dateTime={m.created_at} title={fullTime(m.created_at)} className="tabular-nums">
            {clockText(m.created_at)}
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
        {(canRetry(m) || canSendByHand(m)) && <MessageActions message={m} />}
      </article>
    </li>
  );
}
