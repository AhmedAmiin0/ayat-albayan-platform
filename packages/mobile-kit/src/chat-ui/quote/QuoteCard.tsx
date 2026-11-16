import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { type, useTheme } from '../../theme';
import { AppText } from '../../ui/primitives/AppText';
import { ContentText } from '../../ui/primitives/ContentText';
import { QUOTE_BOX, QUOTE_LINE, quoteLabel, quoteLine } from './quote-style';

export interface QuoteCardProps {
  /** The quoted message's id: its testID and what `onJump` gets. */
  id: string;
  /** Who sent it; null hides the line. */
  sender: string | null;
  /** Its first line (or a file's kind). */
  text: string;
  /** A file's emoji before the text. */
  icon?: string | null;
  /** A photo's or PDF's thumb at the inline-end. */
  thumb?: ReactNode;
  /** Goes to the original; absent, the card is plain. */
  onJump?: (id: string) => void;
}

/**
 * The message a bubble answers, on top of it as WhatsApp draws it (owner 2026-10-31): a bar at the
 * inline-start, who sent it, its first line (a file's icon and kind), a thumb at the end. A tap
 * goes
 * to the original. 44pt tall at least (two short lines + padding).
 */
export function QuoteCard({ id, sender, text, icon, thumb, onJump }: QuoteCardProps) {
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
        borderStartColor: color.lapis,
        backgroundColor: pressed ? color.neutralSoft : color.sunk,
      })}
    >
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {sender ? (
          <AppText
            numberOfLines={1}
            style={{ ...QUOTE_LINE, fontFamily: type.ui[600], color: color.lapis }}
          >
            {sender}
          </AppText>
        ) : null}
        <ContentText
          source={text}
          numberOfLines={1}
          style={{ ...QUOTE_LINE, fontFamily: type.ui[400], color: color.ink2 }}
        >
          {quoteLine(icon, text)}
        </ContentText>
      </View>
      {thumb}
    </Pressable>
  );
}
