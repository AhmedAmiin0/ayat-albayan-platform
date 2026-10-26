import type { SavedReply } from '@ab/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AttachIcon } from '../../shared/chat-icons';
import { HighlightText } from './HighlightText';

export interface QuickReplyRowProps {
  reply: SavedReply;
  /** What was typed after «/» (or in the sheet's search): its letters are bold. */
  query: string;
  onPress: () => void;
}

/** «/» isolated with its title (FSI … PDI), so «/greeting» and «/ترحيب» both read slash-first. */
export const slashTitle = (title: string) => `⁨/${title}⁩`;

/**
 * One quick reply as WhatsApp Business lists it (owner 2026-10-26): «/title» bold in the accent,
 * the text under it in the secondary ink on at most two lines, a paperclip when a file goes with
 * it; ≥ 44pt, a hairline between rows, a wash while pressed. The text keeps its own direction.
 */
export function QuickReplyRow({ reply, query, onPress }: QuickReplyRowProps) {
  const { color } = useTheme();
  const file = reply.attachment !== null;
  const line = (size: number) => ({ fontSize: size, lineHeight: type.lineHeight(size), writingDirection: 'auto' as const });
  return (
    <Pressable
      testID={`quick-reply-${reply.id}`}
      accessibilityRole="button"
      accessibilityLabel={file ? `${reply.title}${t.common.listSeparator}${t.savedReplies.hasAttachment}` : reply.title}
      accessibilityHint={reply.body}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: color.rule,
        backgroundColor: pressed ? color.sunk : 'transparent',
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <HighlightText
          text={slashTitle(reply.title)}
          query={query}
          numberOfLines={1}
          style={{ ...line(type.size.body), fontFamily: type.ui[600], color: color.lapis }}
          strong={{ fontFamily: type.ui[700] }}
        />
        <HighlightText
          text={reply.body.replace(/\s+/g, ' ')}
          query={query}
          numberOfLines={2}
          style={{ ...line(type.size.sm), fontFamily: type.ui[400], color: color.ink2 }}
          strong={{ fontFamily: type.ui[700], color: color.ink }}
        />
      </View>
      {file ? <AttachIcon color={color.ink3} size={18} /> : null}
    </Pressable>
  );
}
