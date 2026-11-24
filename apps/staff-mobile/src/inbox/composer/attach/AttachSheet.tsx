import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { t, shape, useTheme, AttachTile, CameraIcon, DocumentIcon, EmojiIcon, GalleryIcon } from '@ab/mobile-kit';
import { SavedReplyIcon, TemplateIcon } from '@/inbox/shared/chat-icons';
import type { ChatFileSource } from '@/inbox/composer/send-file';
import { useSwipeClose } from './use-swipe-close';

interface AttachSheetProps {
  visible: boolean;
  onPick: (source: ChatFileSource) => void;
  onTemplate: () => void;
  /** Absent means no quick-replies tile. */
  onReplies?: (() => void) | undefined;
  onEmoji: () => void;
  onClose: () => void;
}

/** The small bar on top that says «drag me down». */
function DragHandle() {
  const { color } = useTheme();
  return (
    <View
      testID="attach-handle"
      style={{
        alignSelf: 'center',
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: color.ruleInput,
      }}
    />
  );
}

/** The six tiles in reading order (a wrapping row, so it mirrors with the phone). */
function Tiles(p: AttachSheetProps) {
  const tint = useTheme().color.lapis;
  const c = t.inbox.composer;
  const then = (act: () => void) => () => {
    p.onClose();
    act();
  };
  return (
    <View
      testID="attach-tiles"
      style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: 20 }}
    >
      <AttachTile label={c.gallery} onPress={then(() => p.onPick('image'))}>
        <GalleryIcon color={tint} />
      </AttachTile>
      <AttachTile label={c.camera} onPress={then(() => p.onPick('camera'))}>
        <CameraIcon color={tint} />
      </AttachTile>
      <AttachTile
        label={c.document}
        short={c.tileShort.document}
        onPress={then(() => p.onPick('pdf'))}
      >
        <DocumentIcon color={tint} />
      </AttachTile>
      <AttachTile label={c.modeTemplate} onPress={then(p.onTemplate)}>
        <TemplateIcon color={tint} />
      </AttachTile>
      {p.onReplies ? (
        <AttachTile
          label={t.savedReplies.open}
          short={c.tileShort.replies}
          onPress={then(p.onReplies)}
        >
          <SavedReplyIcon color={tint} />
        </AttachTile>
      ) : null}
      <AttachTile label={c.emoji} short={c.tileShort.emoji} onPress={then(p.onEmoji)}>
        <EmojiIcon color={tint} />
      </AttachTile>
    </View>
  );
}

/** No cancel button: swipe down, outside tap or Android back closes it. */
export function AttachSheet(p: AttachSheetProps) {
  const { color } = useTheme();
  const swipe = useSwipeClose(p.onClose);
  return (
    <Modal
      testID="attach-modal"
      visible={p.visible}
      transparent
      animationType="fade"
      onRequestClose={p.onClose}
      onShow={swipe.reset}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* A sibling, not a parent, so screen readers reach each tile before the scrim. */}
        <Pressable
          testID="attach-scrim"
          accessibilityRole="button"
          accessibilityLabel={t.common.cancel}
          onPress={p.onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]}
        />
        <Animated.View
          testID="attach-sheet"
          {...swipe.handlers}
          style={{
            gap: 20,
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: 32,
            borderTopStartRadius: shape.radius.lg,
            borderTopEndRadius: shape.radius.lg,
            backgroundColor: color.raised,
            transform: [{ translateY: swipe.translateY }],
          }}
        >
          <DragHandle />
          <Tiles {...p} />
        </Animated.View>
      </View>
    </Modal>
  );
}
