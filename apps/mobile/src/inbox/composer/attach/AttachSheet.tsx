import { Modal, Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { PriceIcon, SavedReplyIcon, TemplateIcon } from '../../shared/chat-icons';
import { CameraIcon, DocumentIcon, GalleryIcon } from '../../shared/composer-icons';
import type { ChatFileSource } from '../send-file';
import { AttachTile } from './AttachTile';

interface AttachSheetProps {
  visible: boolean;
  onPick: (source: ChatFileSource) => void;
  onTemplate: () => void;
  /** «الردود السريعة» (staff); absent → no tile. */
  onReplies?: (() => void) | undefined;
  /** «عرض سعر» (staff with pricing.read); absent → no tile. */
  onQuote?: (() => void) | undefined;
  onClose: () => void;
}

/**
 * The paperclip's sheet as WhatsApp Business (owner 2026-10-27): round tiles in reading order (a
 * wrapping row, so it mirrors with the phone), «المعرض» «الكاميرا» «مستند PDF» «قالب» «الردود
 * السريعة» «عرض سعر». A tap outside or «إلغاء» closes it; each tile closes it before it acts.
 */
export function AttachSheet(p: AttachSheetProps) {
  const { color } = useTheme();
  const then = (act: () => void) => () => {
    p.onClose();
    act();
  };
  const tint = color.lapis;
  return (
    <Modal visible={p.visible} transparent animationType="fade" onRequestClose={p.onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.common.cancel}
        onPress={p.onClose}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: color.scrim }}
      >
        {/* A tap on the sheet itself does not close it. */}
        <View
          testID="attach-sheet"
          onStartShouldSetResponder={() => true}
          style={{
            gap: 16,
            padding: 16,
            paddingBottom: 32,
            borderTopStartRadius: shape.radius.lg,
            borderTopEndRadius: shape.radius.lg,
            backgroundColor: color.raised,
          }}
        >
          <View testID="attach-tiles" style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16, justifyContent: 'space-around' }}>
            <AttachTile label={t.inbox.composer.gallery} onPress={then(() => p.onPick('image'))}>
              <GalleryIcon color={tint} />
            </AttachTile>
            <AttachTile label={t.inbox.composer.camera} onPress={then(() => p.onPick('camera'))}>
              <CameraIcon color={tint} />
            </AttachTile>
            <AttachTile label={t.inbox.composer.document} onPress={then(() => p.onPick('pdf'))}>
              <DocumentIcon color={tint} />
            </AttachTile>
            <AttachTile label={t.inbox.composer.modeTemplate} onPress={then(p.onTemplate)}>
              <TemplateIcon color={tint} />
            </AttachTile>
            {p.onReplies ? (
              <AttachTile label={t.savedReplies.open} onPress={then(p.onReplies)}>
                <SavedReplyIcon color={tint} />
              </AttachTile>
            ) : null}
            {p.onQuote ? (
              <AttachTile label={t.inbox.quote.open} onPress={then(p.onQuote)}>
                <PriceIcon color={tint} />
              </AttachTile>
            ) : null}
          </View>
          <Button variant="ghost" label={t.common.cancel} onPress={p.onClose} />
        </View>
      </Pressable>
    </Modal>
  );
}
