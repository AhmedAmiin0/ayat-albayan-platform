import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { IconButton } from '@/ui/IconButton';
import { useChatActions } from './chat-actions';
import { CloseIcon } from './chat-icons';
import { quoteOf, quoteSender, quoteText } from './quote-text';

/**
 * Over the composer while she answers a message: ONE line (sender · first line) and ✕, 44pt in all,
 * so the thread keeps its reading height. Shown only while free text can go out.
 */
export function QuoteStrip() {
  const { color } = useTheme();
  const { reply, setReply, threadName } = useChatActions();
  if (!reply) return null;
  const quote = quoteOf(reply);
  const sender = quoteSender(quote, threadName);
  const text = quoteText(quote);
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
      <AppText
        numberOfLines={1}
        accessibilityLabel={`${t.inbox.reply.strip}: ${[sender, text].filter(Boolean).join(': ')}`}
        style={{
          flex: 1,
          fontFamily: type.ui[400],
          fontSize: type.size.sm,
          lineHeight: type.lineHeight(type.size.sm),
          color: color.ink2,
          writingDirection: 'auto',
        }}
      >
        {sender ? (
          <AppText
            style={{ fontFamily: type.ui[600], color: color.lapis }}
          >{`${sender} · `}</AppText>
        ) : null}
        {text}
      </AppText>
      <IconButton label={t.inbox.reply.cancel} onPress={() => setReply(null)}>
        <CloseIcon color={color.ink2} size={18} />
      </IconButton>
    </View>
  );
}
