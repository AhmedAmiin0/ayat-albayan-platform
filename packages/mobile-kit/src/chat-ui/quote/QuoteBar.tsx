import { View } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { shape, type, useTheme } from '../../theme';
import { AppText } from '../../ui/primitives/AppText';
import { ContentText } from '../../ui/primitives/ContentText';
import { IconButton } from '../../ui/primitives/IconButton';
import { CloseIcon } from '../icons/chat-glyphs';
import { quoteLabel, quoteLine } from './quote-style';

export interface QuoteBarProps {
  /** Who sent the answered message; null hides it. */
  sender: string | null;
  text: string;
  icon?: string | null;
  /** ✕: stop answering it. */
  onCancel: () => void;
}

const BAR = {
  flexDirection: 'row',
  alignItems: 'center',
  minHeight: shape.control.touch,
  paddingStart: 10,
  borderStartWidth: 3,
  borderRadius: shape.radius.sm,
} as const;
const LINE = { fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm) };

/**
 * Over the composer while she answers a message: ONE line (sender · first line) and ✕, 44pt in all,
 * so the thread keeps its reading height. The sender keeps its width; the quoted line sits on the
 * side of its own language (ContentText) and is cut first.
 */
export function QuoteBar({ sender, text, icon, onCancel }: QuoteBarProps) {
  const { color } = useTheme();
  return (
    <View
      testID="reply-strip"
      style={{ ...BAR, borderStartColor: color.lapis, backgroundColor: color.sunk }}
    >
      <View
        testID="reply-strip-line"
        accessible
        accessibilityLabel={`${t.inbox.reply.strip}: ${quoteLabel(sender, text)}`}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        {sender ? (
          <AppText
            numberOfLines={1}
            style={{
              ...LINE,
              flexShrink: 0,
              maxWidth: '45%',
              fontFamily: type.ui[600],
              color: color.lapis,
            }}
          >
            {`${sender} ·`}
          </AppText>
        ) : null}
        <ContentText
          source={text}
          numberOfLines={1}
          style={{ ...LINE, flex: 1, fontFamily: type.ui[400], color: color.ink2 }}
        >
          {quoteLine(icon, text)}
        </ContentText>
      </View>
      <IconButton label={t.inbox.reply.cancel} onPress={onCancel}>
        <CloseIcon color={color.ink2} size={18} />
      </IconButton>
    </View>
  );
}
