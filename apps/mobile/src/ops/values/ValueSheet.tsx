import type { SettingKey, SettingMeta } from '@ab/shared';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { shape, useTheme } from '@/theme';
import { useValueSheet } from './use-value-sheet';
import { ValueSheetBody } from './ValueSheetBody';

export interface ValueSheetProps {
  valueKey: SettingKey;
  saved: unknown;
  canWrite: boolean;
  meta: SettingMeta | undefined;
  onSaved: () => void;
  onClose: () => void;
}

/**
 * A row's bottom sheet (docs/26b §2 phone, states.html#values-phone). A tap outside, the back
 * gesture and «إلغاء» all ask first when an edit is not saved. Mount it only while a row is open.
 * The scrim is a sibling of the sheet and hidden from screen readers, so the sheet's editor and
 * buttons are each reachable on their own (never grouped into one «إغلاق» button).
 */
export function ValueSheet({ valueKey, saved, canWrite, meta, onSaved, onClose }: ValueSheetProps) {
  const { color } = useTheme();
  const sheet = useValueSheet({ valueKey, saved, onSaved, onClose });
  return (
    <Modal visible transparent animationType="slide" onRequestClose={sheet.requestClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          testID="value-sheet-scrim"
          accessible={false}
          importantForAccessibility="no"
          onPress={sheet.requestClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]}
        />
        <View
          testID="value-sheet"
          accessibilityViewIsModal
          style={{
            maxHeight: '90%',
            borderTopLeftRadius: shape.radius.lg,
            borderTopRightRadius: shape.radius.lg,
            backgroundColor: color.raised,
          }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            <ValueSheetBody valueKey={valueKey} saved={saved} canWrite={canWrite} meta={meta} sheet={sheet} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
