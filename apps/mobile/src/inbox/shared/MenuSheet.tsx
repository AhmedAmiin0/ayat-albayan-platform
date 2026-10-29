import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
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
 * outside closes («إلغاء» to a screen reader), its rows 8pt apart.
 */
export function MenuSheet({ open, label, testID, onClose, children }: MenuSheetProps) {
  const { color } = useTheme();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.common.cancel}
        onPress={onClose}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: color.scrim }}
      >
        {/* A tap on the sheet itself does not close it. */}
        <View
          testID={testID}
          accessibilityLabel={label}
          onStartShouldSetResponder={() => true}
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
      </Pressable>
    </Modal>
  );
}
