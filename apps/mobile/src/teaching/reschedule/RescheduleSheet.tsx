import type { LessonView } from '@ab/shared';
import type { ReactNode } from 'react';
import { Modal, ScrollView } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { RescheduleForm } from './RescheduleForm';

interface RescheduleSheetProps {
  /** The lesson to move; null = closed. */
  lesson: LessonView | null;
  onClose: () => void;
  /** «تم» after the move; onClose when absent. */
  onDone?: () => void;
}

/**
 * «غيّر الميعاد» as a page sheet over whichever screen opened it (Today, a teacher's calendar,
 * «الجدول»), so that screen and its tab stay underneath. A new lesson starts a fresh form.
 */
export function RescheduleSheet({ lesson, onClose, onDone }: RescheduleSheetProps) {
  return (
    <RescheduleFrame open={lesson !== null} onClose={onClose}>
      {lesson ? <RescheduleForm key={lesson.id} lesson={lesson} onClose={onClose} onDone={onDone} /> : null}
    </RescheduleFrame>
  );
}

/** The «تغيير ميعاد الحلقة» page sheet around a form (the admin's, or sales' one-lesson form). */
export function RescheduleFrame({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen sheet>
        <ScreenHeader
          size="h2"
          title={t.lessons.rescheduleTitle}
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
