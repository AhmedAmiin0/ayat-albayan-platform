import { isRunningLesson, type SalesScheduleLesson } from '@ab/shared';
import { useState } from 'react';
import { LessonDetailsSheet } from '@/calendar';
import { JoinClassroomButton } from '@/classroom';
import { usePermissions } from '@/auth';
import { useNow } from '@/core/lib/time/use-now';
import { canChangeLesson } from '../lesson-actions/lesson-actions-api';
import { SalesLessonActions } from '../lesson-actions/SalesLessonActions';
import { SalesRescheduleSheet } from '../lesson-actions/SalesRescheduleSheet';

interface SalesLessonSheetProps {
  lesson: SalesScheduleLesson | null;
  onClose: () => void;
  /** Opened from «تفاصيل الطالب» of this student: their name does not open that screen again. */
  studentId?: string;
}

/**
 * The salesperson's «تفاصيل الحلقة» (PR #261): «ادخل الحلقة» while the lesson runs (she joins as the
 * classroom assistant, docs/16). On a lesson of one of HER students (docs/16 row 37) «تغيير الموعد» and
 * «إلغاء الحلقة» too, and her student's name opens «تفاصيل الطالب»; any other lesson stays «للاطلاع فقط».
 * Never a series, an outcome, a confirmation or a report.
 */
export function SalesLessonSheet({ lesson, onClose, studentId }: SalesLessonSheetProps) {
  const now = useNow();
  const can = usePermissions();
  const [moving, setMoving] = useState<SalesScheduleLesson | null>(null);
  const changeable = lesson ? canChangeLesson(lesson, { now, can }) : null;
  return (
    <LessonDetailsSheet
      lesson={lesson}
      role="sales"
      onClose={onClose}
      readOnly={!changeable?.reschedule && !changeable?.cancel}
      hereStudentId={studentId}
      actions={(l) => (
        <>
          {isRunningLesson(l, now) ? <JoinClassroomButton lesson={l} /> : null}
          <SalesLessonActions lesson={l} onReschedule={setMoving} />
        </>
      )}
      sheets={
        <SalesRescheduleSheet
          lesson={moving}
          onClose={() => setMoving(null)}
          onDone={() => {
            setMoving(null);
            onClose();
          }}
        />
      }
    />
  );
}
