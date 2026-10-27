import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ContentText } from '@/core/ui/primitives/ContentText';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { useChatActions } from '../../thread/hooks/chat-actions';
import { CloseIcon } from '../../shared/chat-icons';
import { quoteOf, quoteSender, quoteText } from '../hooks/quote-text';

/**
 * Over the composer while she answers a message: ONE line (sender · first line) and ✕, 44pt in all,
 * so the thread keeps its reading height. Shown only while free text can go out. The sender keeps
 * its width; the quoted line sits on the side of its own language (ContentText) and is cut first.
 */
export function QuoteStrip() {
  const { color } = useTheme();
  const { reply, setReply, threadName } = useChatActions();
  if (!reply) return null;
  const quote = quoteOf(reply);
  const sender = quoteSender(quote, threadName);
  const text = quoteText(quote);
  const line = { fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm) };
  return (
    <View
      testID="reply-strip"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: shape.control.touch,
        paddingStart: 10,
        borderStartWidth: 3,
        borderStartColor: color.lapis,
        borderRadius: shape.radius.sm,
        backgroundColor: color.sunk,
      }}
    >
      <View
        testID="reply-strip-line"
        accessible
        accessibilityLabel={`${t.inbox.reply.strip}: ${[sender, text].filter(Boolean).join(': ')}`}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        {sender ? (
          <AppText numberOfLines={1} style={{ ...line, flexShrink: 0, fontFamily: type.ui[600], color: color.lapis }}>
            {`${sender} ·`}
          </AppText>
        ) : null}
        <ContentText source={text} numberOfLines={1} style={{ ...line, flex: 1, fontFamily: type.ui[400], color: color.ink2 }}>
          {text}
        </ContentText>
      </View>
      <IconButton label={t.inbox.reply.cancel} onPress={() => setReply(null)}>
        <CloseIcon color={color.ink2} size={18} />
      </IconButton>
    </View>
  );
}
