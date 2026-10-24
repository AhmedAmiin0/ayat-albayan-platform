import type { ReactNode } from 'react';
import { Modal, ScrollView } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';

export interface ListSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** The page sheet the lists open in (as «محادثة جديدة»): an h2 title, «إغلاق», the content. */
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
