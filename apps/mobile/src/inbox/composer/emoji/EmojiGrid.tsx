import { Pressable, ScrollView } from 'react-native';
import { shape, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { EMOJI } from './emoji-list';

/**
 * The curated emoji (owner 2026-10-27) in a wrapping row that mirrors with the phone, each 44pt and
 * named by the emoji itself. One tap = one emoji at the caret.
 */
export function EmojiGrid({ onPick }: { onPick: (emoji: string) => void }) {
  const { color } = useTheme();
  return (
    <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
      {EMOJI.map((e) => (
        <Pressable
          key={e}
          accessibilityRole="button"
          accessibilityLabel={e}
          onPress={() => onPick(e)}
          style={({ pressed }) => ({
            width: shape.control.touch,
            height: shape.control.touch,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: shape.radius.md,
            backgroundColor: pressed ? color.lapisWash : 'transparent',
          })}
        >
          <AppText style={{ fontSize: 26 }}>{e}</AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}
