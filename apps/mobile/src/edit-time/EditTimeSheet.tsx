import { Modal, ScrollView } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { EditTimeForm } from './EditTimeForm';
import { editMode, type EditableLesson } from './types';

export interface EditTimeSheetProps {
  /** The lesson to edit; null = closed. */
  lesson: EditableLesson | null;
  onClose: () => void;
}

/**
 * «عدّل الوقت» as a page sheet over whichever screen opened it (Today, a teacher's calendar,
 * «الجدول»), like «غيّر الميعاد»: that screen and its tab stay underneath. A held lesson's title
 * says «تصحيح»; a new lesson starts a fresh form.
 */
export function EditTimeSheet({ lesson, onClose }: EditTimeSheetProps) {
  const correcting = lesson !== null && editMode(lesson) === 'correct';
  return (
    <Modal visible={lesson !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen>
        <ScreenHeader
          size="h2"
          title={correcting ? t.editTime.correctTitle : t.editTime.title}
          trailing={<Button variant="ghost" label={t.common.close} onPress={onClose} />}
        />
        <ScrollView
          style={{ flex: 1, marginHorizontal: -16 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {lesson ? <EditTimeForm key={lesson.id} lesson={lesson} onClose={onClose} /> : null}
        </ScrollView>
      </Screen>
    </Modal>
  );
}
