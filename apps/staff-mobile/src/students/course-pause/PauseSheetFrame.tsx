import type { ReactNode } from 'react';
import { Modal, ScrollView } from 'react-native';
import { t, Button, Screen, ScreenHeader } from '@ab/mobile-kit';

interface PauseSheetFrameProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

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
