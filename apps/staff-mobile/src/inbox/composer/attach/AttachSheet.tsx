import { View } from 'react-native';
import {
  t,
  useTheme,
  AttachTile,
  Sheet,
  CameraIcon,
  DocumentIcon,
  EmojiIcon,
  GalleryIcon,
} from '@ab/mobile-kit';
import { SavedReplyIcon, TemplateIcon } from '@/inbox/shared/chat-icons';
import type { ChatFileSource } from '@/inbox/composer/send-file';

interface AttachSheetProps {
  visible: boolean;
  onPick: (source: ChatFileSource) => void;
  onTemplate: () => void;
  /** Absent means no quick-replies tile. */
  onReplies?: (() => void) | undefined;
  onEmoji: () => void;
  onClose: () => void;
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

/** No cancel button: a drag down, the scrim or Android back closes it. */
export function AttachSheet(p: AttachSheetProps) {
  return (
    <Sheet
      open={p.visible}
      onClose={p.onClose}
      label={t.inbox.composer.attach}
      testID="attach-sheet"
    >
      <Tiles {...p} />
    </Sheet>
  );
}
