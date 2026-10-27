import { Modal, Pressable, ScrollView, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { EMOJI } from './emoji-list';

interface EmojiSheetProps {
  visible: boolean;
  /** One tap = one emoji at the caret; the sheet stays open for more. */
  onPick: (emoji: string) => void;
  /** «تم» or a tap outside: closed, the box takes the focus back. */
  onClose: () => void;
}

/**
 * The pill's emoji (owner 2026-10-27): a curated grid in a wrapping row (it mirrors with the phone),
 * each 44pt and named by the emoji itself. ponytail: no search, categories, skin tones, stickers or
 * GIFs; a full picker needs a dependency, added only if the owner asks.
 */
export function EmojiSheet({ visible, onPick, onClose }: EmojiSheetProps) {
  const { color } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.inbox.composer.emojiDone}
        onPress={onClose}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: color.scrim }}
      >
        <View
          testID="emoji-sheet"
          onStartShouldSetResponder={() => true}
          style={{
            maxHeight: '50%',
            gap: 8,
            padding: 12,
            paddingBottom: 24,
            borderTopStartRadius: shape.radius.lg,
            borderTopEndRadius: shape.radius.lg,
            backgroundColor: color.raised,
          }}
        >
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
          <Button variant="secondary" label={t.inbox.composer.emojiDone} onPress={onClose} />
        </View>
      </Pressable>
    </Modal>
  );
}
