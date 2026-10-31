import { memo } from 'react';
import { isChatViewMime, type MessageView } from '@ab/shared';
import { type GestureResponderEvent, Linking, Pressable, View, type ViewStyle } from 'react-native';
import { useHolds } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { holdTop, useBubbleActions } from '../hooks/bubble-actions';
import { ReactionPill } from '../reactions/ReactionPill';
import { useBubbleChatActions } from '../../thread/hooks/chat-actions';
import { bubbleSide } from '../hooks/bubble-side';
import { MessageActions } from './MessageActions';
import { MessageFile } from './MessageFile';
import { FailReason, MessageMeta, useSmall } from './MessageMeta';
import { mediaLine, templateLine } from '../hooks/message-text';
import { QuoteBlock } from './QuoteBlock';
import { SwipeReply } from './SwipeReply';
import { LinkedText } from '../text/LinkedText';
import { ResendAsk } from '../resend/ResendAsk';
import { useThreadMode } from '../../thread/hooks/thread-mode';
import { ReplyNoteLine } from '../reply-actions';
import { TappedLabel } from '../template/TappedLabel';
import { TemplateButtons } from '../template/TemplateButtons';
import { TemplateFrame } from '../template/TemplateFrame';
import { HiddenBody } from '@/inbox/messages/components/hide/HiddenBody';

/** A file line: a link to the signed URL once the API has the file, else its kind and why not. */
function MediaLine({ label, url, file }: { label: string; url: string | null; file: boolean }) {
  const { color } = useTheme();
  const style = {
    fontFamily: type.ui[600],
    fontSize: type.size.sm,
    lineHeight: type.lineHeight(type.size.sm),
    color: url ? color.lapis : color.ink2,
    textDecorationLine: url ? ('underline' as const) : ('none' as const),
  };
  if (!url) return <AppText style={style}>{file ? `${label} · ${t.inbox.mediaNotDownloaded}` : label}</AppText>;
  return (
    <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(url)}>
      <AppText style={style}>{label}</AppText>
    </Pressable>
  );
}

/** The bubble's padding: a template's button rows reach past it to the edges. */
const PAD = { x: 10, bottom: 6 };

export interface MessageBubbleProps {
  message: MessageView;
  phone: string;
  /** A tap on its quote: MessageList scrolls to the original. */
  onJump?: (id: string) => void;
  /** Just jumped to: a mint edge for a moment. */
  highlight?: boolean;
}

/**
 * One message (R-MSG-05). As WhatsApp (owner 2026-10-27): ours at the inline-end, theirs at the start
 * (bubbleSide: the left/right in Arabic, the right/left in English), the sharp tail corner at the top of the screen-edge side.
 * Ours carry WhatsApp-style delivery ticks (DeliveryTicks, named by the status word); a template
 * row says which template, its body already rendered by the API; links in the text open (LinkedText). Ours say who sent them
 * («أرسلها: سارة», «رسالة تلقائية»); a photo previews, a PDF, voice note or video opens from MessageFile. Why a send failed is for everyone (as the web's
 * outboundNotes); retry / sent-by-hand stay the admin's, behind a tap on «! لم تُرسل» or the reason, as WhatsApp (FailedSheet, R-MSG-05).
 */
export const MessageBubble = memo(function MessageBubble({ message: m, phone, onJump, highlight = false }: MessageBubbleProps) {
  const { color } = useTheme();
  // «رد» / «إعادة توجيه» (owner 2026-10-25): a long press opens the menu, a swipe answers.
  const touch = useBubbleActions(m);
  // «تفاعل» (owner 2026-10-27): the row floats over the held bubble; the pill names who reacted.
  const hold = (e?: GestureResponderEvent) => touch.openMenu(holdTop(e));
  const { openReactors, openFailed } = useBubbleChatActions();
  const admin = useThreadMode().kind === 'admin';
  // The sales tree has no thread mode either: the actions' endpoints need messages.manage (admin-only).
  const manages = useHolds('messages.manage');
  const small = useSmall();
  const ours = m.direction === 'outbound';
  const media = mediaLine(m);
  // A photo, PDF, voice note or video we can serve (W6): opened or played from the bubble.
  const file = m.media_url === null && isChatViewMime(m.media_mime);
  const stuck = admin && manages && ours && (m.status === 'failed' || m.click_to_chat !== null);
  // A hand-off asks «هل أرسلتها؟» in MessageActions instead of a reason.
  const why = ours && m.status === 'failed' && m.error_code !== 'handed_off';
  const asking = stuck && m.error_code === 'handed_off';
  // The screen reader's way to the menu sits on the text; a file-only bubble keeps its own buttons.
  const a11yOn = m.body ? 'body' : m.template_key ? 'template' : null;
  const side = bubbleSide(ours);
  const box: ViewStyle = {
    alignSelf: side.align,
    maxWidth: '88%',
    gap: 4,
    paddingHorizontal: PAD.x,
    paddingVertical: PAD.bottom,
    borderRadius: shape.radius.lg,
    // A template's buttons span the bubble (WhatsApp): never a sliver, rows clipped to its corners.
    ...(m.template?.buttons.length ? { minWidth: 240, overflow: 'hidden' as const } : {}),
    ...(side.outer === 'start' ? { borderTopStartRadius: shape.radius.xs } : { borderTopEndRadius: shape.radius.xs }),
    borderWidth: 1,
    borderColor: highlight ? color.lapis : ours ? color.lapisWash : color.rule,
    backgroundColor: ours ? color.lapisWash : color.raised,
  };
  const content = m.hidden ? <HiddenBody message={m} /> : (
    <>
      {m.forwarded ? <AppText style={small}>{t.inbox.forward.forwarded}</AppText> : null}
      {m.reply_to ? <QuoteBlock quote={m.reply_to} phone={phone} onJump={onJump} /> : null}
      {m.template_key ? (
        <AppText style={small} {...(a11yOn === 'template' ? touch.a11y : {})}>
          {templateLine(m.template_key)}
        </AppText>
      ) : null}
      <TappedLabel message={m} />
      <TemplateFrame block={m.template} hasMedia={m.media_mime !== null || m.media_url !== null}>
        {file ? <MessageFile message={m} phone={phone} onLongPress={touch.has ? hold : undefined} /> : null}
        {media && !file ? <MediaLine label={media} url={m.media_url} file={m.media_mime !== null} /> : null}
        <ResendAsk message={m} phone={phone} />
        {m.body ? <LinkedText text={m.body} touch={touch} a11y={a11yOn === 'body'} /> : null}
      </TemplateFrame>
      {/* What a quick reply did, or «تأكيد الحلقة» / «تغيير الموعد» for its lesson (owner 2026-10-28). */}
      <ReplyNoteLine message={m} />
      {/* A held hand-off's «!» too, on purpose: its sheet reopens WhatsApp if the admin left before sending. */}
      <MessageMeta message={m} onTicksPress={stuck ? () => openFailed(m) : undefined} />
      {/* Right under the time, as WhatsApp; a failed send's reason (and «هل أرسلتها؟») below them. */}
      {m.template ? (
        <TemplateButtons buttons={m.template.buttons} inset={{ x: PAD.x, bottom: why || asking ? 0 : PAD.bottom }} onLongPress={touch.has ? hold : undefined} />
      ) : null}
      {why ? <FailReason message={m} onPress={stuck ? () => openFailed(m) : undefined} /> : null}
      {asking ? <MessageActions message={m} phone={phone} /> : null}
    </>
  );
  const pill = <ReactionPill message={m} side={side.outer === 'start' ? 'start' : 'end'} onPress={() => openReactors(m)} />;
  if (!touch.has) {
    return (
      <>
        <View testID={`bubble-${m.id}`} style={box}>{content}</View>
        {pill}
      </>
    );
  }
  return (
    <SwipeReply onReply={touch.swipe}>
      <Pressable testID={`bubble-${m.id}`} accessible={false} onLongPress={hold} delayLongPress={350} style={box}>
        {content}
      </Pressable>
      {pill}
    </SwipeReply>
  );
});
