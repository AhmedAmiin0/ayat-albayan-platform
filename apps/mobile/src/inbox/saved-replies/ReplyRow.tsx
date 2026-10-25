import type { SavedReply } from '@ab/shared';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { AttachIcon } from '../shared/chat-icons';

export interface ReplyRowProps {
  reply: SavedReply;
  /** Picks it (the composer) or opens it (settings); without it the row is text. */
  onPress?: () => void;
  /** Its actions at the inline-end (edit, delete, move), 44pt each. */
  trailing?: ReactNode;
}

/** One saved reply: its title, the first line of its text and a paperclip when a file goes with it; 56pt. */
export function ReplyRow({ reply, onPress, trailing }: ReplyRowProps) {
  const { color } = useTheme();
  const file = reply.attachment !== null;
  return (
    <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 4, paddingStart: 16, paddingEnd: 8, borderBottomWidth: 1, borderBottomColor: color.rule }}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={file ? `${reply.title}${t.common.listSeparator}${t.savedReplies.hasAttachment}` : reply.title}
        accessibilityHint={reply.body}
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => ({ flex: 1, minHeight: 44, justifyContent: 'center', paddingVertical: 6, opacity: pressed ? 0.7 : 1 })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppText numberOfLines={1} style={{ flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.base, color: color.ink }}>
            {reply.title}
          </AppText>
          {file ? <AttachIcon color={color.ink3} size={16} /> : null}
        </View>
        <AppText numberOfLines={1} style={{ fontFamily: type.ui[400], fontSize: type.size.sm, color: color.ink2 }}>
          {reply.body.replace(/\s+/g, ' ')}
        </AppText>
      </Pressable>
      {trailing}
    </View>
  );
}
