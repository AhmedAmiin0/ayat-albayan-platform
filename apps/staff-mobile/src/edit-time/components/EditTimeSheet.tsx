import type { LessonView } from '@ab/schedule';
import { t, RescheduleFrame } from '@ab/mobile-kit';
import { EditTimeForm } from './EditTimeForm';
import { editMode } from '@/edit-time/lib/types';

interface EditTimeSheetProps {
  /** The lesson to edit; null = closed. */
  lesson: LessonView | null;
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
    <RescheduleFrame
      open={lesson !== null}
      onClose={onClose}
      title={correcting ? t.editTime.correctTitle : t.editTime.title}
    >
      {lesson ? <EditTimeForm key={lesson.id} lesson={lesson} onClose={onClose} /> : null}
    </RescheduleFrame>
  );
}
