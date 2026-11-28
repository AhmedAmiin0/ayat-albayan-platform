import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import { IconButton } from '../../../ui/primitives/IconButton';
import { CloseIcon } from '../../icons/chat-glyphs';
import { quoteLabel } from '../quote-style';
import { QuoteText } from '../QuoteText';
import type { QuoteBarProps } from './QuoteBar.types';
import { BAR, LINE } from './quote-bar.helpers';

/**
 * Over the composer while she answers a message: ONE line (sender · first line) and ✕, 44pt in all,
 * so the thread keeps its reading height. The sender keeps its width; the quoted line sits on the
 * side of its own language (ContentText) and is cut first.
 */
export function QuoteBar(p: QuoteBarProps) {
  const { sender, text, onCancel, tone = 'lapis' } = p;
  const { color } = useTheme();
  return (
    <View
      testID="reply-strip"
      style={{ ...BAR, borderStartColor: color[tone], backgroundColor: color.sunk }}
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
              color: color[tone],
            }}
          >
            {`${sender} ·`}
          </AppText>
        ) : null}
        <QuoteText text={text} icon={p.icon} glyph={p.glyph} style={{ ...LINE, flex: 1 }} />
      </View>
      <IconButton label={t.inbox.reply.cancel} onPress={onCancel}>
        <CloseIcon color={color.ink2} size={18} />
      </IconButton>
    </View>
  );
}
