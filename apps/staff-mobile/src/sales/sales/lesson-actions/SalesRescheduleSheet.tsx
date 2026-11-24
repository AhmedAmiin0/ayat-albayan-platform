import type { SalesScheduleLesson } from '@ab/shared';
import { RescheduleFrame } from '@ab/mobile-kit';
import { SalesRescheduleForm } from './SalesRescheduleForm';

interface SalesRescheduleSheetProps {
  lesson: SalesScheduleLesson | null;
  onClose: () => void;
  /** After the move the lesson is gone from its old time, so its details close too. */
  onDone: () => void;
}

/** Null means closed. */
export function SalesRescheduleSheet({ lesson, onClose, onDone }: SalesRescheduleSheetProps) {
  return (
    <RescheduleFrame open={lesson !== null} onClose={onClose}>
      {lesson ? <SalesRescheduleForm key={lesson.id} lesson={lesson} onDone={onDone} /> : null}
    </RescheduleFrame>
  );
}
