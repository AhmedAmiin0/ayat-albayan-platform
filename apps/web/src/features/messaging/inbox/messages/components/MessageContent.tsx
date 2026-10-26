import { isUnavailableMessage, isUnsupportedMessage, replyNote, senderLine, splitLinks, type MessageView } from '@ab/shared';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import { templateLine } from '../../format';
import { MessageMedia } from './MessageMedia';
import { QuoteBlock } from './QuoteBlock';
import { RatingChip } from '../../sales/RatingChip';

// The inside of a MessageBubble: what was said, and who sent ours.

/** Staff forwarded it here (owner 2026-10-25): a small label with the forward arrow, as WhatsApp does. */
function ForwardedLabel() {
  return (
    <p className="mb-1 flex items-center gap-1 text-2xs font-semibold text-ink-3">
      <Icon name="forward" className="size-3.5" />
      {t.inbox.forward.forwarded}
    </p>
  );
}

/** The text with its http(s) and www. links clickable (W11, splitLinks). */
function Body({ text }: { text: string }) {
  return (
    <p dir="auto" className="whitespace-pre-wrap [overflow-wrap:anywhere]">
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

/** Who sent ours (D4): «أرسلها: سارة» for staff, «رسالة تلقائية» for a job; nothing for theirs or history. */
export function SenderLine({ message: m }: { message: MessageView }) {
  const line = senderLine(m);
  if (!line) return null;
  const text = line.kind === 'name' ? t.inbox.sentBy.replace('{name}', line.name) : t.inbox.automaticMessage;
  return <p className="mt-1 text-2xs font-semibold text-ink-2">{text}</p>;
}

/**
 * No text, file or template: Meta's `unsupported` asks the sender again («غير متاحة» for 131060);
 * anything else (a location, a contact card…) did arrive and only cannot be shown here.
 */
export function emptyText(m: Pick<MessageView, 'interactive_payload'>): string {
  if (isUnavailableMessage(m.interactive_payload)) return t.inbox.unavailable;
  return isUnsupportedMessage(m.interactive_payload) ? t.inbox.unsupported : t.inbox.media.other;
}

/** What was said: «مُعاد توجيهها», the quote it answers, the template's name, the media, the text, what a quick reply did. */
export function Content({ message: m }: { message: MessageView }) {
  const empty = !m.body && !m.media_mime && !m.template_key;
  return (
    <>
      {m.forwarded && <ForwardedLabel />}
      {m.reply_to && <QuoteBlock quote={m.reply_to} outbound={m.direction === 'outbound'} />}
      {m.template_key && <p className="mb-1 text-2xs font-semibold text-ink-3">{templateLine(m.template_key)}</p>}
      {(m.media_mime || m.media_url) && <MessageMedia message={m} />}
      {m.body && <Body text={m.body} />}
      {empty && <p className="text-xs text-ink-3">{emptyText(m)}</p>}
      <ReplyLine message={m} />
      <RatingChip message={m} />
    </>
  );
}
