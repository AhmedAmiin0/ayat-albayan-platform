import type { MessageQuote } from '@ab/shared';
import { Pressable } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { useChatActions } from '../../thread/hooks/chat-actions';
import { quoteSender, quoteText } from '../hooks/quote-text';

export interface QuoteBlockProps {
  quote: MessageQuote;
  /** Scrolls to the original and lights it up (MessageList); absent, the block is plain. */
  onJump?: (id: string) => void;
}

/**
 * The message a bubble answers, on top of it as WhatsApp draws it: a mint bar at the inline-start, who
 * sent it, its first line. A tap goes to the original. 44pt tall at least (two short lines + padding).
 */
export function QuoteBlock({ quote, onJump }: QuoteBlockProps) {
  const { color } = useTheme();
  const { threadName } = useChatActions();
  const sender = quoteSender(quote, threadName);
  const text = quoteText(quote);
  const line = { fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs) };
  return (
    <Pressable
      testID={`quote-${quote.id}`}
      accessibilityRole="button"
      accessibilityLabel={[sender, text].filter(Boolean).join(': ')}
      accessibilityHint={t.inbox.reply.jump}
      disabled={!onJump}
      onPress={() => onJump?.(quote.id)}
      style={({ pressed }) => ({
        minHeight: shape.control.touch,
        justifyContent: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderStartWidth: 3,
        borderStartColor: color.lapis,
        borderRadius: shape.radius.sm,
        backgroundColor: pressed ? color.neutralSoft : color.sunk,
      })}
    >
      {sender ? (
        <AppText
          numberOfLines={1}
          style={{ ...line, fontFamily: type.ui[600], color: color.lapis }}
        >
          {sender}
        </AppText>
      ) : null}
      <AppText
        numberOfLines={1}
        style={{ ...line, fontFamily: type.ui[400], color: color.ink2, writingDirection: 'auto' }}
      >
        {text}
      </AppText>
    </Pressable>
  );
}
