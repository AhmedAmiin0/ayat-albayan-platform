import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { shape, useTheme } from '../../theme';

interface MenuSheetProps {
  open: boolean;
  label: string;
  testID: string;
  onClose: () => void;
  children: ReactNode;
}

/** A tap outside closes it; screen readers get a cancel after the rows. */
export function MenuSheet({ open, label, testID, onClose, children }: MenuSheetProps) {
  const { color } = useTheme();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* A sibling so VoiceOver reaches each row, not one cancel over the sheet. */}
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
            borderTopStartRadius: shape.radius.lg,
            borderTopEndRadius: shape.radius.lg,
            backgroundColor: color.raised,
          }}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}
