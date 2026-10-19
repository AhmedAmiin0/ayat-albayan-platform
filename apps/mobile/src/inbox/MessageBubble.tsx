import { isChatViewMime, type MessageView, replyNote } from '@ab/shared';
import { Linking, Pressable, View } from 'react-native';
import { useHolds } from '@/auth/use-permissions';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { MessageActions } from './MessageActions';
import { MessageFile } from './MessageFile';
import { MessageMeta, useSmall } from './MessageMeta';
import { errorLine, mediaLine, templateLine } from './message-text';
import { useThreadMode } from './thread-mode';

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

/**
 * One message (R-MSG-05). Theirs at the inline-start, ours at the end, as WhatsApp lays out Arabic.
 * Ours carry WhatsApp-style delivery ticks (DeliveryTicks, named by the status word); a template
 * row says which template, its body already rendered by the API. Ours say who sent them
 * («أرسلها: سارة», «رسالة تلقائية»); a photo, PDF, voice note or video opens from MessageFile. Why a send failed is for everyone (as the web's
 * outboundNotes); retry / sent-by-hand stay the admin's (R-MSG-05).
 */
export function MessageBubble({ message: m, phone }: { message: MessageView; phone: string }) {
  const { color } = useTheme();
  const admin = useThreadMode().kind === 'admin';
  // The sales tree has no thread mode either: the actions' endpoints need messages.manage (admin-only).
  const manages = useHolds('messages.manage');
  const small = useSmall();
  const ours = m.direction === 'outbound';
  const media = mediaLine(m);
  // A photo, PDF, voice note or video we can serve (W6): opened or played from the bubble.
  const file = m.media_url === null && isChatViewMime(m.media_mime);
  // What a quick reply did (R-SCH-03): «اتأكدت حلقة …» only when its lesson is confirmed now.
  const note = replyNote(m, locale);
  const stuck = admin && manages && ours && (m.status === 'failed' || m.click_to_chat !== null);
  // A hand-off asks «بعتّها؟» in MessageActions instead of a reason.
  const why = ours && m.status === 'failed' && m.error_code !== 'handed_off';
  return (
    <View
      style={{
        alignSelf: ours ? 'flex-end' : 'flex-start',
        maxWidth: '88%',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: ours ? color.lapisWash : color.rule,
        backgroundColor: ours ? color.lapisWash : color.raised,
      }}
    >
      {m.template_key ? <AppText style={small}>{templateLine(m.template_key)}</AppText> : null}
      {file ? <MessageFile message={m} phone={phone} /> : null}
      {media && !file ? <MediaLine label={media} url={m.media_url} file={m.media_mime !== null} /> : null}
      {m.body ? (
        <AppText
          selectable
          style={{
            fontFamily: type.ui[400],
            fontSize: type.size.body,
            lineHeight: type.lineHeight(type.size.body),
            color: color.ink,
            writingDirection: 'auto',
          }}
        >
          {m.body}
        </AppText>
      ) : null}
      {note ? (
        <AppText style={{ ...small, fontFamily: type.ui[600] }}>
          {t.inbox.quickReply[note.key].replace('{when}', note.when ?? '')}
        </AppText>
      ) : null}
      <MessageMeta message={m} />
      {why ? <AppText style={{ ...small, fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs) }}>{errorLine(m)}</AppText> : null}
      {stuck ? <MessageActions message={m} phone={phone} /> : null}
    </View>
  );
}
