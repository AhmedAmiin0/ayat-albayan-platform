import { Modal, ScrollView } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { PayForm, type PayFormProps } from './PayForm';

export interface PaySheetProps extends PayFormProps {
  open: boolean;
  onClose: () => void;
}

/**
 * «تسجيل دفعة للمعلم/ة» as a page sheet over the earnings screen (like «عدّل الوقت»). The form is
 * mounted only while open, so each opening is a new pay form with its own clientRequestId.
 */
export function PaySheet({ open, onClose, onDone, ...form }: PaySheetProps) {
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen>
        <ScreenHeader
          size="h2"
          title={t.teacherEarnings.dialogTitle}
          trailing={<Button variant="ghost" label={t.common.close} onPress={onClose} />}
        />
        <ScrollView
          style={{ flex: 1, marginHorizontal: -16 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {open ? (
            <PayForm
              {...form}
              onDone={() => {
                onDone();
                onClose();
              }}
            />
          ) : null}
        </ScrollView>
      </Screen>
    </Modal>
  );
}
