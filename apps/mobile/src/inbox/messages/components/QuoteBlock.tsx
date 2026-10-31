import { isUnavailableQuote, type MessageQuote, quoteIcon, type ReplyQuote } from '@ab/shared';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ContentText } from '@/core/ui/primitives/ContentText';
import { useBubbleChatActions } from '@/inbox/thread/hooks/chat-actions';
import { useQuoteThumb } from '@/inbox/messages/hooks/quote-thumb';
import { quoteSender, quoteText } from '@/inbox/messages/hooks/quote-text';

export interface QuoteBlockProps {
  quote: ReplyQuote;
  /** The chat's number: a quoted photo's or PDF's thumb (absent: the icon only). */
  phone?: string;
  /** Scrolls to the original and lights it up (MessageList); absent, the block is plain. */
  onJump?: (id: string) => void;
}

const LINE = { fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs) };
const BOX = {
  minHeight: shape.control.touch,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  paddingVertical: 4,
  paddingHorizontal: 8,
  borderStartWidth: 3,
  borderRadius: shape.radius.sm,
} as const;

/** A quoted photo's or PDF's thumb at the inline-end, as WhatsApp; nothing when it cannot load. */
function QuoteThumb({ quote, phone }: { quote: MessageQuote; phone: string }) {
  const uri = useQuoteThumb(quote, phone);
  const [broken, setBroken] = useState<string | null>(null);
  if (!uri || broken === uri) return null;
  return (
    <Image
      testID={`quote-thumb-${quote.id}`}
      source={{ uri }}
      onError={() => setBroken(uri)}
      style={{ width: 40, height: 40, borderRadius: shape.radius.xs }}
    />
  );
}

/** «رسالة غير متاحة»: WhatsApp quoted a message we never stored; greyed, nothing to tap. */
function Unavailable() {
  const { color } = useTheme();
  return (
    <View
      testID="quote-unavailable"
      style={{ ...BOX, borderStartColor: color.ruleStrong, backgroundColor: color.sunk }}
    >
      <AppText numberOfLines={1} style={{ ...LINE, fontFamily: type.ui[400], color: color.ink3 }}>
        {t.inbox.reply.unavailable}
      </AppText>
    </View>
  );
}

/**
 * The message a bubble answers, on top of it as WhatsApp draws it (owner 2026-10-31): a mint bar
 * at the inline-start, who sent it, its first line (a file's icon and kind), a photo's or PDF's
 * thumb at the end. A tap goes to the original. 44pt tall at least (two short lines + padding).
 */
export function QuoteBlock({ quote, phone, onJump }: QuoteBlockProps) {
  const { color } = useTheme();
  const { threadName } = useBubbleChatActions();
  if (isUnavailableQuote(quote)) return <Unavailable />;
  const sender = quoteSender(quote, threadName);
  const text = quoteText(quote);
  const icon = quoteIcon(quote);
  return (
    <Pressable
      testID={`quote-${quote.id}`}
      accessibilityRole="button"
      accessibilityLabel={[sender, text].filter(Boolean).join(': ')}
      accessibilityHint={t.inbox.reply.jump}
      disabled={!onJump}
      onPress={() => onJump?.(quote.id)}
      style={({ pressed }) => ({
        ...BOX,
        borderStartColor: color.lapis,
        backgroundColor: pressed ? color.neutralSoft : color.sunk,
      })}
    >
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {sender ? (
          <AppText
            numberOfLines={1}
            style={{ ...LINE, fontFamily: type.ui[600], color: color.lapis }}
          >
            {sender}
          </AppText>
        ) : null}
        <ContentText
          source={text}
          numberOfLines={1}
          style={{ ...LINE, fontFamily: type.ui[400], color: color.ink2 }}
        >
          {icon ? `${icon} ${text}` : text}
        </ContentText>
      </View>
      {phone ? <QuoteThumb quote={quote} phone={phone} /> : null}
    </Pressable>
  );
}
