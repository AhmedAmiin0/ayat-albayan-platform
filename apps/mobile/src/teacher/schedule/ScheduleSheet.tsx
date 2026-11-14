import type { LessonView } from '@ab/shared';
import { LessonDetailsSheet } from '@/calendar';
import { JoinClassroomButton } from '@/classroom';
import { TeacherLessonTools, useTimedNotice } from '@/teacher/lesson-actions';
import { Notice } from '@/today';

/**
 * «تفاصيل الحلقة» of «جدولي» (teacher variant, docs/46 C7): its students, report state, «ادخل
 * الحلقة», and before it starts «سأحضر» / «إلغاء الحلقة». Shared by the week and the month.
 */
interface ScheduleSheetProps {
  lesson: LessonView | null;
  onClose: () => void;
}

export function ScheduleSheet({ lesson, onClose }: ScheduleSheetProps) {
  const notice = useTimedNotice();
  return (
    <LessonDetailsSheet
      lesson={lesson}
      role="teacher"
      onClose={onClose}
      actions={(l) => (
        <>
          {notice.text ? <Notice message={notice.text} /> : null}
          <JoinClassroomButton lesson={l} />
          <TeacherLessonTools lesson={l} onDone={notice.show} />
        </>
      )}
    />
  );
}
