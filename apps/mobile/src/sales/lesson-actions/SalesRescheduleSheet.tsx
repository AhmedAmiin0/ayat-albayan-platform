import type { SalesScheduleLesson } from '@ab/shared';
import { RescheduleFrame } from '@/teaching';
import { SalesRescheduleForm } from './SalesRescheduleForm';

interface SalesRescheduleSheetProps {
  lesson: SalesScheduleLesson | null;
  onClose: () => void;
  /** «تم» after the move: the lesson shown under it is gone from its old time, so its details close too. */
  onDone: () => void;
}

/** «تغيير الموعد» as a page sheet over «تفاصيل الحلقة» (the admin's frame, sales' one-lesson form); null = closed. */
export function SalesRescheduleSheet({ lesson, onClose, onDone }: SalesRescheduleSheetProps) {
  return (
    <RescheduleFrame open={lesson !== null} onClose={onClose}>
      {lesson ? <SalesRescheduleForm key={lesson.id} lesson={lesson} onClose={onClose} onDone={onDone} /> : null}
    </RescheduleFrame>
  );
}
