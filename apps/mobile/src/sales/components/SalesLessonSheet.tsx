import { isRunningLesson, type SalesScheduleLesson } from '@ab/shared';
import { LessonDetailsSheet } from '@/calendar';
import { JoinClassroomButton } from '@/classroom';
import { useNow } from '@/today';

interface SalesLessonSheetProps {
  lesson: SalesScheduleLesson | null;
  onClose: () => void;
}

/**
 * The salesperson's «تفاصيل الحلقة» (PR #261): read-only («للاطلاع فقط»), and «ادخل الحلقة» only
 * while the lesson runs (she joins as the classroom assistant, docs/16). No تأكيد, إلغاء or move.
 */
export function SalesLessonSheet({ lesson, onClose }: SalesLessonSheetProps) {
  const now = useNow();
  return (
    <LessonDetailsSheet
      lesson={lesson}
      role="sales"
      onClose={onClose}
      actions={(l) => (isRunningLesson(l, now) ? <JoinClassroomButton lesson={l} /> : null)}
    />
  );
}
