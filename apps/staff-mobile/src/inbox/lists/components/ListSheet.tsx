import type { ReactNode } from 'react';
import { Modal, ScrollView } from 'react-native';
import { t, Button, Screen, ScreenHeader } from '@ab/mobile-kit';

interface ListSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function ListSheet({ open, title, onClose, children }: ListSheetProps) {
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen sheet>
        <ScreenHeader
          size="h2"
          title={title}
          trailing={<Button variant="ghost" label={t.common.close} onPress={onClose} />}
        />
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
          {children}
        </ScrollView>
      </Screen>
    </Modal>
  );
}
