import { memo } from 'react';
import { isChatViewMime, type MessageView, pdfCaptionIsName } from '@ab/shared';
import { type GestureResponderEvent, Linking, Pressable, type ViewStyle } from 'react-native';
import {
  useHolds,
  t,
  type,
  useTheme,
  AppText,
  useSmallText,
  BubbleShell,
  BUBBLE_PAD as PAD,
  bubbleSide,
  SwipeReply,
} from '@ab/mobile-kit';
import { holdTop, useBubbleActions } from '@/inbox/messages/hooks/bubble-actions';
import { ReactionPill } from '@/inbox/messages/reactions/ReactionPill';
import { useBubbleChatActions } from '@/inbox/thread/hooks/chat-actions';
import { stickerBubble } from '@/inbox/messages/hooks/bubble-side';
import { MessageActions } from './MessageActions';
import { MessageFile } from './MessageFile';
import { FailReason, MessageMeta } from './MessageMeta';
import { mediaLine, templateLine } from '@/inbox/messages/hooks/message-text';
import { QuoteBlock } from './QuoteBlock';
import { LinkedText } from '@/inbox/messages/text/LinkedText';
import { ResendAsk } from '@/inbox/messages/resend/ResendAsk';
import { useThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { ReplyNoteLine } from '@/inbox/messages/reply-actions';
import { TappedLabel } from '@/inbox/messages/template/TappedLabel';
import { TemplateButtons } from '@/inbox/messages/template/TemplateButtons';
import { TemplateFrame } from '@/inbox/messages/template/TemplateFrame';
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

export interface MessageBubbleProps {
  message: MessageView;
  phone: string;
  /** A tap on its quote: MessageList scrolls to the original. */
  onJump?: (id: string) => void;
  /** Just jumped to: a mint edge for a moment. */
  highlight?: boolean;
}

/** R-MSG-05: why a send failed is for everyone; retry and manual send stay the admin's. */
export const MessageBubble = memo(function MessageBubble({ message: m, phone, onJump, highlight = false }: MessageBubbleProps) {
  const touch = useBubbleActions(m);
  const hold = (e?: GestureResponderEvent) => touch.openMenu(holdTop(e));
  const { openReactors, openFailed } = useBubbleChatActions();
  const mode = useThreadMode().kind;
  const admin = mode === 'admin';
  // The sales tree has no thread mode either: the actions' endpoints need messages.manage (admin-only).
  const manages = useHolds('messages.manage');
  const small = useSmallText();
  const ours = m.direction === 'outbound';
  const media = mediaLine(m);
  // A photo, PDF, voice note or video we can serve (W6): opened or played from the bubble.
  const file = m.media_url === null && isChatViewMime(m.media_mime);
  const stuck = admin && manages && ours && (m.status === 'failed' || m.click_to_chat !== null);
  // A hand-off asks whether it was sent instead of showing a reason.
  const why = ours && m.status === 'failed' && m.error_code !== 'handed_off';
  const asking = stuck && m.error_code === 'handed_off';
  // The screen reader's way to the menu sits on the text; a file-only bubble keeps its own buttons.
  // A PDF's caption that is only its name stays off: its card shows it (owner 2026-11-01).
  const caption = pdfCaptionIsName(m) ? null : m.body;
  const a11yOn = caption ? 'body' : m.template_key ? 'template' : null;
  const side = bubbleSide(ours);
  // A template's buttons span the bubble (WhatsApp): never a sliver, rows clipped to its corners.
  const box: ViewStyle = {
    ...(m.template?.buttons.length ? { minWidth: 240, overflow: 'hidden' as const } : {}),
    ...stickerBubble(m, mode === 'teacher'),
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
        {caption ? <LinkedText text={caption} touch={touch} a11y={a11yOn === 'body'} /> : null}
      </TemplateFrame>
      <ReplyNoteLine message={m} />
      {/* A held hand-off's «!» too, on purpose: its sheet reopens WhatsApp if the admin left before sending. */}
      <MessageMeta message={m} onTicksPress={stuck ? () => openFailed(m) : undefined} />
      {m.template ? (
        <TemplateButtons buttons={m.template.buttons} inset={{ x: PAD.x, bottom: why || asking ? 0 : PAD.bottom }} onLongPress={touch.has ? hold : undefined} />
      ) : null}
      {why ? <FailReason message={m} onPress={stuck ? () => openFailed(m) : undefined} /> : null}
      {asking ? <MessageActions message={m} phone={phone} /> : null}
    </>
  );
  const pill = <ReactionPill message={m} side={side.outer === 'start' ? 'start' : 'end'} onPress={() => openReactors(m)} />;
  const shell = { ours, highlight, style: box, testID: `bubble-${m.id}` };
  if (!touch.has) {
    return (
      <>
        <BubbleShell {...shell}>{content}</BubbleShell>
        {pill}
      </>
    );
  }
  return (
    <SwipeReply onReply={touch.swipe}>
      <BubbleShell {...shell} onLongPress={hold}>
        {content}
      </BubbleShell>
      {pill}
    </SwipeReply>
  );
});
