import type { ReactNode } from 'react';
import { Modal, ScrollView } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';

interface PauseSheetFrameProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** The page sheet of «إيقاف الدورة مؤقتًا» and «نهاية الإيقاف», like «تغيير الموعد»: the student's file stays under it. */
export function PauseSheetFrame({ open, title, onClose, children }: PauseSheetFrameProps) {
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen sheet>
        <ScreenHeader size="h2" title={title} trailing={<Button variant="ghost" label={t.common.close} onPress={onClose} />} />
        <ScrollView
          style={{ flex: 1, marginHorizontal: -16 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {open ? children : null}
        </ScrollView>
      </Screen>
    </Modal>
  );
}
