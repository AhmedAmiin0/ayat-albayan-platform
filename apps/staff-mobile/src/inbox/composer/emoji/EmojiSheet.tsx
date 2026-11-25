import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { t, shape, useTheme, Button } from '@ab/mobile-kit';
import type { PanelMedia } from './panel-api';
import { PanelBody, PanelTabs, type PanelTab } from './PanelTabs';

interface EmojiSheetProps {
  visible: boolean;
  /** One tap = one emoji at the caret; the sheet stays open for more. */
  onPick: (emoji: string) => void;
  onClose: () => void;
  /** Staff also get GIF and sticker tabs. */
  media?: PanelMedia | undefined;
}

/**
 * The pill's emoji: a curated grid (no emoji library). Staff get WhatsApp's
 * tabs, Emoji | GIF | Stickers: a GIF or a sticker is sent at once and the
 * sheet closes.
 */
export function EmojiSheet({ visible, onPick, onClose, media }: EmojiSheetProps) {
  const { color } = useTheme();
  const [tab, setTab] = useState<PanelTab>('emoji');
  const shown = media ? tab : 'emoji';
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
            ...(media ? { height: '55%' as const } : { maxHeight: '50%' as const }),
            gap: 8,
            padding: 12,
            paddingBottom: 24,
            borderTopStartRadius: shape.radius.lg,
            borderTopEndRadius: shape.radius.lg,
            backgroundColor: color.raised,
          }}
        >
          {media ? <PanelTabs tab={tab} onTab={setTab} /> : null}
          <PanelBody tab={shown} onPick={onPick} media={media} onSent={onClose} />
          <Button variant="secondary" label={t.inbox.composer.emojiDone} onPress={onClose} />
        </View>
      </Pressable>
    </Modal>
  );
}
