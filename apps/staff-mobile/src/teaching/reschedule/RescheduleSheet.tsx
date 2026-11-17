import type { LessonView } from '@ab/shared';
import { RescheduleFrame } from '@ab/mobile-kit';
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
