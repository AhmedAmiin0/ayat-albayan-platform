import { reactionName, tappedReaction } from '@ab/client-core';
import { REACTION_EMOJIS, type MessageView } from '@ab/shared';
import { Pressable, View, type ViewStyle } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

interface ReactionBarProps {
  message: MessageView;
  /** Window y of the held bubble: the row floats just above it (WhatsApp); null = at the top of the menu. */
  top: number | null;
  /** The emoji to set, or null to remove ours (a tap on our current one). */
  onReact: (emoji: string | null) => void;
  /** «+»: the composer's EmojiSheet. */
  onMore: () => void;
}

/** Its spoken name: «تفاعل بـإعجاب», the emoji itself when it has no name. */
export function emojiLabel(emoji: string): string {
  const name = reactionName(emoji);
  return t.inbox.reactions.withEmoji.replace('{name}', name ? t.inbox.reactions[name] : emoji);
}

/** Never under the status bar, never off the bottom (a bubble low on the screen). */
const ROW = shape.control.touch + 12;
const clampTop = (y: number) => Math.max(48, y - ROW - 8);

/**
 * «تفاعل» (owner 2026-10-27): the 6 quick emoji and «+», each a 44pt button with a spoken name; ours is
 * marked (selected) and a tap on it removes it. A row (flexDirection row) mirrors with the language, so
 * the first emoji sits at the inline start in Arabic and in English.
 */
export function ReactionBar({ message: m, top, onReact, onMore }: ReactionBarProps) {
  const { color } = useTheme();
  const ours = m.reactions?.ours ?? null;
  const float: ViewStyle = top === null ? { alignSelf: 'center' } : { position: 'absolute', top: clampTop(top), start: 0, end: 0, alignItems: 'center' };
  const button = (selected: boolean): ViewStyle => ({
    width: shape.control.touch,
    height: shape.control.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: shape.radius.pill,
    backgroundColor: selected ? color.lapisWash : 'transparent',
  });
  return (
    <View style={float} pointerEvents="box-none">
      <View
        testID="reaction-bar"
        accessibilityRole="toolbar"
        accessibilityLabel={t.inbox.reactions.bar}
        onStartShouldSetResponder={() => true}
        style={{ flexDirection: 'row', padding: 6, gap: 2, borderRadius: shape.radius.pill, backgroundColor: color.raised, borderWidth: 1, borderColor: color.rule }}
      >
        {REACTION_EMOJIS.map((e) => (
          <Pressable
            key={e}
            accessibilityRole="button"
            accessibilityLabel={emojiLabel(e)}
            accessibilityState={{ selected: e === ours }}
            onPress={() => onReact(tappedReaction(m.reactions, e))}
            style={button(e === ours)}
          >
            <AppText style={{ fontSize: 24 }}>{e}</AppText>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" accessibilityLabel={t.inbox.reactions.more} onPress={onMore} style={button(false)}>
          <AppText style={{ fontSize: 22, color: color.ink2 }}>+</AppText>
        </Pressable>
      </View>
    </View>
  );
}
