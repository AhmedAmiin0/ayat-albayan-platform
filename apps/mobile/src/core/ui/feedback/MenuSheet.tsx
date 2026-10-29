import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, useTheme } from '@/theme';

interface MenuSheetProps {
  open: boolean;
  /** The sheet's spoken name («قائمة الرسالة», «خيارات المحادثة»). */
  label: string;
  testID: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * The chat's bottom menus (a bubble's long press, the header's «⋮»): a sheet over a scrim that a tap
 * outside closes («إلغاء» to a screen reader, after the sheet's rows), its rows 8pt apart.
 */
export function MenuSheet({ open, label, testID, onClose, children }: MenuSheetProps) {
  const { color } = useTheme();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* A sibling, not a parent: VoiceOver reaches each row instead of one «إلغاء» over the sheet. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.common.cancel}
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]}
        />
        <View
          testID={testID}
          accessibilityLabel={label}
          accessibilityViewIsModal
          style={{
            gap: 8,
            padding: 16,
            paddingBottom: 32,
            borderTopLeftRadius: shape.radius.lg,
            borderTopRightRadius: shape.radius.lg,
            backgroundColor: color.raised,
          }}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}
