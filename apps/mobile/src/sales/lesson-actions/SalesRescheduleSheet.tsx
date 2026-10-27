import type { SalesScheduleLesson } from '@ab/shared';
import { RescheduleFrame } from '@/teaching';
import { SalesRescheduleForm } from './SalesRescheduleForm';

/** «تغيير الموعد» as a page sheet over «تفاصيل الحلقة» (the admin's frame, sales' one-lesson form); null = closed. */
export function SalesRescheduleSheet({ lesson, onClose }: { lesson: SalesScheduleLesson | null; onClose: () => void }) {
  return (
    <RescheduleFrame open={lesson !== null} onClose={onClose}>
      {lesson ? <SalesRescheduleForm key={lesson.id} lesson={lesson} onClose={onClose} /> : null}
    </RescheduleFrame>
  );
}
