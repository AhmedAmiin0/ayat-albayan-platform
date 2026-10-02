import { type MessageView, messageStatusStyle, replyNote } from '@ab/shared';
import { Linking, Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { StatusChip } from '@/ui/StatusChip';
import { MessageActions } from './MessageActions';
import { mediaLine, queuedLine, stamp, templateLine } from './message-text';

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

function useSmall() {
  const { color } = useTheme();
  return {
    fontFamily: type.ui[500],
    fontSize: type.size['2xs'],
    lineHeight: type.lineHeight(type.size['2xs']),
    color: color.ink2,
    fontVariant: ['tabular-nums' as const],
  };
}

/** When, and for ours the status word; a row scheduled later says when it goes. */
function MessageMeta({ message: m }: { message: MessageView }) {
  const small = useSmall();
  const later = queuedLine(m);
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <AppText style={small}>{stamp(m.created_at)}</AppText>
        {m.direction === 'outbound' ? (
          <StatusChip
            {...messageStatusStyle[m.status]}
            label={t.enums.messageStatus[m.status]}
            size="sm"
          />
        ) : null}
      </View>
      {later ? <AppText style={small}>{later}</AppText> : null}
    </>
  );
}

/**
 * One message (R-MSG-05). Theirs at the inline-start, ours at the end, as WhatsApp lays out Arabic.
 * Ours carry the status word (في الطابور، اتبعتت، وصلت، اتقرت، متبعتتش، اتبعتت يدوي); a template
 * row says which template, its body already rendered by the API.
 */
export function MessageBubble({ message: m, phone }: { message: MessageView; phone: string }) {
  const { color } = useTheme();
  const small = useSmall();
  const ours = m.direction === 'outbound';
  const media = mediaLine(m);
  // What a quick reply did (R-SCH-03): «اتأكدت حلقة …» only when its lesson is confirmed now.
  const note = replyNote(m);
  const stuck = ours && (m.status === 'failed' || m.click_to_chat !== null);
  return (
    <View
      style={{
        alignSelf: ours ? 'flex-end' : 'flex-start',
        maxWidth: '88%',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: ours ? color.lapisWash : color.rule,
        backgroundColor: ours ? color.lapisWash : color.raised,
      }}
    >
      {m.template_key ? <AppText style={small}>{templateLine(m.template_key)}</AppText> : null}
      {media ? <MediaLine label={media} url={m.media_url} file={m.media_mime !== null} /> : null}
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
      {stuck ? <MessageActions message={m} phone={phone} /> : null}
    </View>
  );
}
