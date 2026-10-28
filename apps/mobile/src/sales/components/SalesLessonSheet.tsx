import { canSalesConfirm, isRunningLesson, type SalesScheduleLesson } from '@ab/shared';
import { useState } from 'react';
import { LessonDetailsSheet } from '@/calendar';
import { JoinClassroomButton } from '@/classroom';
import { useHolds, usePermissions } from '@/auth';
import { Note } from '@/more';
import { t } from '@/core/lib/i18n/i18n';
import { useNow } from '@/core/lib/time/use-now';
import { canChangeLesson } from '../lesson-actions/lesson-actions-api';
import { SalesConfirmLesson } from '../lesson-actions/SalesConfirmLesson';
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
 * classroom assistant, docs/16). «تأكيد الحلقة» on ANY scheduled lesson not ended yet (owner 2026-10-28, lessons.confirm;
 * then it reads «مؤكدة»). On a lesson of one of HER students (docs/16 row 37) «تغيير الموعد» and «إلغاء الحلقة» too,
 * and her student's name opens «تفاصيل الطالب» (not from that student's own file, `studentId`); a lesson with no
 * action stays «للاطلاع فقط». Never a series, an outcome or a report.
 */
export function SalesLessonSheet({ lesson, onClose, studentId }: SalesLessonSheetProps) {
  const now = useNow();
  const can = usePermissions();
  const holdsConfirm = useHolds('lessons.confirm');
  const [moving, setMoving] = useState<SalesScheduleLesson | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const justConfirmed = lesson !== null && lesson.id === confirmedId;
  const shown = lesson && justConfirmed ? { ...lesson, status: 'confirmed' as const } : lesson;
  const changeable = shown ? canChangeLesson(shown, { now, can }) : null;
  const confirmable = shown ? canSalesConfirm(shown, { now, holds: holdsConfirm }) : false;
  return (
    <LessonDetailsSheet
      lesson={shown}
      role="sales"
      onClose={onClose}
      readOnly={!changeable?.reschedule && !changeable?.cancel && !confirmable && !justConfirmed}
      hereStudentId={studentId}
      actions={(l) => (
        <>
          {isRunningLesson(l, now) ? <JoinClassroomButton lesson={l} /> : null}
          {confirmable ? <SalesConfirmLesson lessonId={l.id} onConfirmed={() => setConfirmedId(l.id)} /> : null}
          {justConfirmed ? <Note>{t.sales.lessonActions.confirmed}</Note> : null}
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
