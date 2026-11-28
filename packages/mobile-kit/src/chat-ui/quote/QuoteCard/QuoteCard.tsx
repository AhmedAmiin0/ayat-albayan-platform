import { Pressable, View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import { QUOTE_BOX, QUOTE_LINE, quoteLabel } from '../quote-style';
import { QuoteText } from '../QuoteText';
import type { QuoteCardProps } from './QuoteCard.types';

/**
 * The message a bubble answers, on top of it as WhatsApp draws it: a bar at the
 * inline-start, who sent it, its first line (a file's icon and kind), a thumb at the end. A tap
 * goes to the original. 44pt tall at least (two short lines + padding).
 */
export function QuoteCard(p: QuoteCardProps) {
  const { id, sender, text, thumb, onJump, tone = 'lapis' } = p;
  const { color } = useTheme();
  return (
    <Pressable
      testID={`quote-${id}`}
      accessibilityRole="button"
      accessibilityLabel={quoteLabel(sender, text)}
      accessibilityHint={t.inbox.reply.jump}
      disabled={!onJump}
      onPress={() => onJump?.(id)}
      style={({ pressed }) => ({
        ...QUOTE_BOX,
        borderStartColor: color[tone],
        backgroundColor: pressed ? color.neutralSoft : color.sunk,
      })}
    >
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {sender ? (
          <AppText
            numberOfLines={1}
            style={{ ...QUOTE_LINE, fontFamily: type.ui[600], color: color[tone] }}
          >
            {sender}
          </AppText>
        ) : null}
        <QuoteText text={text} icon={p.icon} glyph={p.glyph} style={QUOTE_LINE} />
      </View>
      {thumb}
    </Pressable>
  );
}
