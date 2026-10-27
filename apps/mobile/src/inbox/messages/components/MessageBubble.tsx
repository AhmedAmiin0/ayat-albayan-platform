import { isChatViewMime, type MessageView, replyNote } from '@ab/shared';
import { Linking, Pressable, View, type ViewStyle } from 'react-native';
import { useHolds } from '@/auth/use-permissions';
import { useClockCycle } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { useBubbleActions } from '../hooks/bubble-actions';
import { bubbleSide } from '../hooks/bubble-side';
import { MessageActions } from './MessageActions';
import { MessageFile } from './MessageFile';
import { MessageMeta, useSmall } from './MessageMeta';
import { errorLine, mediaLine, templateLine } from '../hooks/message-text';
import { QuoteBlock } from './QuoteBlock';
import { SwipeReply } from './SwipeReply';
import { LinkedText } from '../text/LinkedText';
import { ResendAsk } from '../resend/ResendAsk';
import { useThreadMode } from '../../thread/hooks/thread-mode';

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

/**
 * One message (R-MSG-05). As WhatsApp (owner 2026-10-27): ours at the inline-end, theirs at the start
 * (bubbleSide: the left/right in Arabic, the right/left in English), the sharp tail corner at the top of the screen-edge side.
 * Ours carry WhatsApp-style delivery ticks (DeliveryTicks, named by the status word); a template
 * row says which template, its body already rendered by the API; links in the text open (LinkedText). Ours say who sent them
 * («أرسلها: سارة», «رسالة تلقائية»); a photo previews, a PDF, voice note or video opens from MessageFile. Why a send failed is for everyone (as the web's
 * outboundNotes); retry / sent-by-hand stay the admin's (R-MSG-05).
 */
export function MessageBubble({ message: m, phone, onJump, highlight = false }: MessageBubbleProps) {
  const { color } = useTheme();
  // «رد» / «إعادة توجيه» (owner 2026-10-25): a long press opens the menu, a swipe answers.
  const touch = useBubbleActions(m);
  const admin = useThreadMode().kind === 'admin';
  // The sales tree has no thread mode either: the actions' endpoints need messages.manage (admin-only).
  const manages = useHolds('messages.manage');
  const small = useSmall();
  const ours = m.direction === 'outbound';
  const media = mediaLine(m);
  // A photo, PDF, voice note or video we can serve (W6): opened or played from the bubble.
  const file = m.media_url === null && isChatViewMime(m.media_mime);
  // What a quick reply did (R-SCH-03): «اتأكدت حلقة …» only when its lesson is confirmed now.
  const note = replyNote(m, { locale, cycle: useClockCycle() });
  const stuck = admin && manages && ours && (m.status === 'failed' || m.click_to_chat !== null);
  // A hand-off asks «بعتّها؟» in MessageActions instead of a reason.
  const why = ours && m.status === 'failed' && m.error_code !== 'handed_off';
  // The screen reader's way to the menu sits on the text; a file-only bubble keeps its own buttons.
  const a11yOn = m.body ? 'body' : m.template_key ? 'template' : null;
  const side = bubbleSide(ours);
  const box: ViewStyle = {
    alignSelf: side.align,
    maxWidth: '88%',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: shape.radius.lg,
    ...(side.outer === 'start' ? { borderTopStartRadius: shape.radius.xs } : { borderTopEndRadius: shape.radius.xs }),
    borderWidth: 1,
    borderColor: highlight ? color.lapis : ours ? color.lapisWash : color.rule,
    backgroundColor: ours ? color.lapisWash : color.raised,
  };
  const content = (
    <>
      {m.forwarded ? <AppText style={small}>{t.inbox.forward.forwarded}</AppText> : null}
      {m.reply_to ? <QuoteBlock quote={m.reply_to} onJump={onJump} /> : null}
      {m.template_key ? (
        <AppText style={small} {...(a11yOn === 'template' ? touch.a11y : {})}>
          {templateLine(m.template_key)}
        </AppText>
      ) : null}
      {file ? <MessageFile message={m} phone={phone} onLongPress={touch.has ? touch.openMenu : undefined} /> : null}
      {media && !file ? <MediaLine label={media} url={m.media_url} file={m.media_mime !== null} /> : null}
      <ResendAsk message={m} phone={phone} />
      {m.body ? <LinkedText text={m.body} touch={touch} a11y={a11yOn === 'body'} /> : null}
      {note ? (
        <AppText style={{ ...small, fontFamily: type.ui[600] }}>
          {t.inbox.quickReply[note.key].replace('{when}', note.when ?? '')}
        </AppText>
      ) : null}
      <MessageMeta message={m} />
      {why ? <AppText style={{ ...small, fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs) }}>{errorLine(m)}</AppText> : null}
      {stuck ? <MessageActions message={m} phone={phone} /> : null}
    </>
  );
  if (!touch.has) return <View testID={`bubble-${m.id}`} style={box}>{content}</View>;
  return (
    <SwipeReply onReply={touch.swipe}>
      <Pressable testID={`bubble-${m.id}`} accessible={false} onLongPress={touch.openMenu} delayLongPress={350} style={box}>
        {content}
      </Pressable>
    </SwipeReply>
  );
}
