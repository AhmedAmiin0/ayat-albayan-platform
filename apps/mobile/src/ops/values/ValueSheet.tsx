import type { SettingKey, SettingMeta } from '@ab/shared';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { t } from '@/lib/i18n';
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
 */
export function ValueSheet({ valueKey, saved, canWrite, meta, onSaved, onClose }: ValueSheetProps) {
  const { color } = useTheme();
  const sheet = useValueSheet({ valueKey, saved, onSaved, onClose });
  return (
    <Modal visible transparent animationType="slide" onRequestClose={sheet.requestClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.common.close}
        onPress={sheet.requestClose}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: color.scrim }}
      >
        {/* A tap on the sheet itself does not close it. */}
        <View
          onStartShouldSetResponder={() => true}
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
      </Pressable>
    </Modal>
  );
}
