import { Modal, Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import type { CopyRequest } from '../../messages/hooks/chat-tools';

export interface CopySheetProps {
  /** What to copy; null hides the sheet. */
  request: CopyRequest | null;
  onClose: () => void;
}

/**
 * «نسخ النص» / «نسخ الرقم» without a clipboard module (owner 2026-10-26): the exact text, selectable.
 * Nothing on the sheet handles a long press, so the OS selection handles copy all of it or a part.
 */
export function CopySheet({ request, onClose }: CopySheetProps) {
  const { color } = useTheme();
  return (
    <Modal visible={request !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: color.scrim }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.common.cancel} onPress={onClose} style={{ flex: 1 }} />
        <View
          testID="copy-sheet"
          style={{
            gap: 12,
            padding: 16,
            paddingBottom: 32,
            borderTopLeftRadius: shape.radius.lg,
            borderTopRightRadius: shape.radius.lg,
            backgroundColor: color.raised,
          }}
        >
          <AppText accessibilityRole="header" style={{ fontFamily: type.ui[700], fontSize: type.size.body, color: color.ink }}>
            {request?.title}
          </AppText>
          <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink2 }}>{t.inbox.copy.hint}</AppText>
          <AppText
            testID="copy-text"
            selectable
            style={{
              maxHeight: 320,
              padding: 12,
              borderRadius: shape.radius.md,
              backgroundColor: color.sunk,
              fontFamily: type.ui[400],
              fontSize: type.size.body,
              lineHeight: type.lineHeight(type.size.body),
              color: color.ink,
              writingDirection: 'auto',
            }}
          >
            {request?.text}
          </AppText>
          <Button variant="ghost" label={t.common.close} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
