import type { LessonView } from '@ab/schedule';
import { RescheduleFrame } from '@ab/mobile-kit';
import { RescheduleForm } from './RescheduleForm';

interface RescheduleSheetProps {
  /** The lesson to move; null = closed. */
  lesson: LessonView | null;
  onClose: () => void;
  /** Falls back to onClose when absent. */
  onDone?: () => void;
}

/** A page sheet so the opening screen and its tab stay underneath; a new lesson resets the form. */
export function RescheduleSheet({ lesson, onClose, onDone }: RescheduleSheetProps) {
  return (
    <RescheduleFrame open={lesson !== null} onClose={onClose}>
      {lesson ? <RescheduleForm key={lesson.id} lesson={lesson} onClose={onClose} onDone={onDone} /> : null}
    </RescheduleFrame>
  );
}
