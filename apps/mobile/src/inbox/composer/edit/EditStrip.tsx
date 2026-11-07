import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { AppText } from '@/core/ui/primitives/AppText';
import { ContentText } from '@/core/ui/primitives/ContentText';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { CloseIcon } from '@/inbox/shared/chat-icons';
import { quoteOf, quoteText } from '@/inbox/messages/hooks/quote-text';
import { useChatActions } from '@/inbox/thread/hooks/chat-actions';
import { shape, type, useTheme } from '@/theme';

/**
 * Over the composer while she corrects a message (owner 2026-11-07), as WhatsApp's edit bar:
 * «تعديل الرسالة» over the original's first line, ✕ beside them, then the one line that says
 * the family gets a new «تصحيح» reply (WhatsApp cannot edit a sent message). Shown only while
 * free text can go out.
 */
export function EditStrip() {
  const { color } = useTheme();
  const { editing, cancelEdit } = useChatActions();
  if (!editing) return null;
  const text = quoteText(quoteOf(editing));
  const line = { fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs) };
  const bar = { borderStartWidth: 3, borderStartColor: color.lapis, backgroundColor: color.sunk };
  const title = { ...line, fontFamily: type.ui[600], color: color.lapis };
  return (
    <View testID="edit-strip" style={{ gap: 2 }}>
      <View style={{ ...bar, flexDirection: 'row', borderRadius: shape.radius.sm }}>
        <View
          accessible
          accessibilityLabel={`${t.inbox.correction.bar}: ${text}`}
          style={{ flex: 1, justifyContent: 'center', paddingVertical: 4, paddingStart: 8 }}
        >
          <AppText numberOfLines={1} style={title}>
            {t.inbox.correction.bar}
          </AppText>
          <ContentText
            source={text}
            numberOfLines={1}
            style={{ ...line, fontFamily: type.ui[400], color: color.ink2 }}
          >
            {text}
          </ContentText>
        </View>
        <IconButton label={t.inbox.correction.cancel} onPress={cancelEdit}>
          <CloseIcon color={color.ink2} size={18} />
        </IconButton>
      </View>
      <Note>{t.inbox.correction.note}</Note>
    </View>
  );
}
