import { Pressable, ScrollView } from 'react-native';
import { useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import { EMOJI } from '@ab/client-core';
import type { EmojiGridProps } from './EmojiGrid.types';
import { emojiCell, GRID } from './emoji-grid.helpers';

/**
 * The curated emoji in a wrapping row that mirrors with the phone, each 44pt and
 * named by the emoji itself. One tap = one emoji at the caret.
 */
export function EmojiGrid({ onPick }: EmojiGridProps) {
  const { color } = useTheme();
  return (
    <ScrollView contentContainerStyle={GRID}>
      {EMOJI.map((e) => (
        <Pressable
          key={e}
          accessibilityRole="button"
          accessibilityLabel={e}
          onPress={() => onPick(e)}
          style={emojiCell(color.lapisWash)}
        >
          <AppText style={{ fontSize: 26 }}>{e}</AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}
