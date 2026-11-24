import type { ReactNode } from 'react';
import { Modal, ScrollView } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { Screen } from '../../layout/Screen';
import { ScreenHeader } from '../../layout/ScreenHeader';
import { Button } from '../../primitives/Button';

interface RescheduleFrameProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * A page sheet around a move form (the admin's, sales' one-lesson form, the family's request),
 * over whichever screen opened it, so that screen and its tab stay underneath.
 */
export function RescheduleFrame({ open, onClose, title, children }: RescheduleFrameProps) {
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen sheet>
        <ScreenHeader
          size="h2"
          title={title ?? t.lessons.rescheduleTitle}
          trailing={<Button variant="ghost" label={t.common.close} onPress={onClose} />}
        />
        <ScrollView
          style={{ flex: 1, marginHorizontal: -16 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </Screen>
    </Modal>
  );
}
