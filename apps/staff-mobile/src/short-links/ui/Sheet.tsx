import type { ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { t, type, useTheme, AppText, Button } from '@ab/mobile-kit';

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** The pinned bottom: «تم · 5», «احفظ». */
  footer: ReactNode;
  testID?: string;
}

/** A page sheet over the form (boards LinkXStaffPeople, the edit): title, «إغلاق», body, footer. */
export function Sheet({ title, onClose, children, footer, testID }: SheetProps) {
  const { color } = useTheme();
  const rule = { borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.rule };
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View testID={testID} style={{ flex: 1, paddingTop: 16, backgroundColor: color.page }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
          }}
        >
          <AppText
            accessibilityRole="header"
            style={{ fontFamily: type.ui[700], fontSize: type.size.lg, color: color.ink }}
          >
            {title}
          </AppText>
          <Button variant="ghost" label={t.shortLinks.form.close} onPress={onClose} />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 12, padding: 16 }}
        >
          {children}
        </ScrollView>
        <View style={{ ...rule, gap: 8, padding: 16, paddingBottom: 32 }}>{footer}</View>
      </View>
    </Modal>
  );
}
