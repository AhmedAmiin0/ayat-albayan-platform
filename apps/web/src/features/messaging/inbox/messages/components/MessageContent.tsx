import {
  isUnavailableMessage,
  isUnsupportedMessage,
  messageNote,
  pdfCaptionIsName,
  reactionText,
  senderLine,
  type MessageView,
} from '@ab/shared';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import { templateLine } from '@/features/messaging/inbox/format';
import { MessageMedia } from './MessageMedia';
import { LinkedBody } from '@/components/ui/display/linked-body';
import { QuoteBlock } from './QuoteBlock';
import { NoteLine } from '@/features/messaging/inbox/messages/notes/NoteLine';
import { ResendAsk } from '@/features/messaging/inbox/messages/resend/ResendAsk';
import { RatingChip } from '@/features/messaging/inbox/sales/RatingChip';
import { ReplyNoteLine } from '@/features/messaging/inbox/messages/reply-actions';
import { TappedLabel } from '@/features/messaging/inbox/messages/template/TappedLabel';
import { TemplateFrame } from '@/features/messaging/inbox/messages/template/TemplateFrame';

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

/** Who sent ours (D4): «أرسلها: سارة» for staff, «رسالة تلقائية» for a job; nothing for theirs or history. */
export function SenderLine({ message: m }: { message: MessageView }) {
  const line = senderLine(m);
  if (!line) return null;
  const text = line.kind === 'name' ? t.inbox.sentBy.replace('{name}', line.name) : t.inbox.automaticMessage;
  return <p className="mt-1 text-2xs font-semibold text-ink-2">{text}</p>;
}

/**
 * No text, file or template: Meta's `unsupported` asks the sender again (131060, often a new number's
 * first message, says why and that it shows in the WhatsApp Business app; ResendAsk offers to ask);
 * anything else (a location, a contact card…) did arrive and only cannot be shown here.
 */
export function emptyText(m: Pick<MessageView, 'interactive_payload'>): string {
  const reacted = reactionText(m.interactive_payload, { reacted: t.inbox.reacted, removed: t.inbox.reactionRemoved });
  if (reacted) return reacted;
  if (isUnavailableMessage(m.interactive_payload)) return t.inbox.unavailable;
  return isUnsupportedMessage(m.interactive_payload) ? t.inbox.unsupported : t.inbox.media.other;
}

/** Why there is nothing to show, and for Meta's 131060 «اطلب إعادة الإرسال» where she may write. */
function EmptyLine({ message: m }: { message: MessageView }) {
  return (
    <>
      <p className="text-xs text-ink-3">{emptyText(m)}</p>
      <ResendAsk message={m} />
    </>
  );
}

const isEmpty = (m: MessageView): boolean => !m.body && !m.media_mime && !m.template_key;
const hasMedia = (m: MessageView): boolean => Boolean(m.media_mime || m.media_url);

/**
 * What was said: «مُعاد توجيهها», the quote it answers, the template's name, «ضغطة زرّ» on a tapped button,
 * a template's header, the media, the text, its footer, what a quick reply did and what to do now.
 * A message deleted for everyone shows only that; an edited one «تم التعديل» (owner 2026-10-30).
 */
/** The caption under the media; none when it is only a PDF's name (on its card, 2026-11-01). */
const shownCaption = (m: MessageView): string | null => (pdfCaptionIsName(m) ? null : m.body);

export function Content({ message: m }: { message: MessageView }) {
  const caption = shownCaption(m);
  if (m.deleted) return <NoteLine message={m} />;
  const empty = isEmpty(m);
  const noted = messageNote(m) !== null;
  const media = hasMedia(m);
  return (
    <>
      {m.forwarded && <ForwardedLabel />}
      {m.reply_to && <QuoteBlock quote={m.reply_to} outbound={m.direction === 'outbound'} />}
      {m.template_key && <p className="mb-1 text-2xs font-semibold text-ink-3">{templateLine(m.template_key)}</p>}
      <TappedLabel message={m} />
      <TemplateFrame block={m.template} hasMedia={media}>
        {media && <MessageMedia message={m} />}
        {caption && <LinkedBody text={caption} />}
      </TemplateFrame>
      {empty && (noted ? <NoteLine message={m} /> : <EmptyLine message={m} />)}
      {m.edited && <p className="mt-0.5 text-2xs text-ink-3">{t.inbox.edited}</p>}
      <ReplyNoteLine message={m} />
      <RatingChip message={m} />
    </>
  );
}
