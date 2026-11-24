import { Modal, Pressable, ScrollView, View } from 'react-native';
import { t, shape, type, useTheme, AppText, Button } from '@ab/mobile-kit';
import { ContentText } from '@/core/ui/primitives/ContentText';
import type { CopyRequest } from './chat-tools';

interface CopySheetProps {
  /** What to copy; null hides the sheet. */
  request: CopyRequest | null;
  onClose: () => void;
}

/** The clipboard module is not wired here yet, so the OS text selection does the copying. */
export function CopySheet({ request, onClose }: CopySheetProps) {
  const { color } = useTheme();
  return (
    <Modal visible={request !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: color.scrim }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.common.cancel}
          onPress={onClose}
          style={{ flex: 1 }}
        />
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
          <AppText
            accessibilityRole="header"
            style={{ fontFamily: type.ui[700], fontSize: type.size.body, color: color.ink }}
          >
            {request?.title}
          </AppText>
          <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink2 }}>
            {t.inbox.copy.hint}
          </AppText>
          {/* A long message scrolls: its end stays reachable to select. */}
          <ScrollView
            style={{ maxHeight: 320, borderRadius: shape.radius.md, backgroundColor: color.sunk }}
          >
            <ContentText
              testID="copy-text"
              source={request?.text ?? ''}
              selectable
              style={{
                padding: 12,
                fontFamily: type.ui[400],
                fontSize: type.size.body,
                lineHeight: type.lineHeight(type.size.body),
                color: color.ink,
              }}
            >
              {request?.text}
            </ContentText>
          </ScrollView>
          <Button variant="secondary" label={t.common.close} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
