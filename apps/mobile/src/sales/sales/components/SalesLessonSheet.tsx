import { canSalesConfirm, isRunningLesson, type SalesScheduleLesson } from '@ab/shared';
import { useState } from 'react';
import { LessonDetailsSheet } from '@/calendar';
import { JoinClassroomButton } from '@/classroom';
import { useHolds, usePermissions } from '@/core/auth';
import { Note } from '@/more';
import { t } from '@/core/lib/i18n/i18n';
import { useNow } from '@/core/lib/time/use-now';
import { useLessonStatusText } from '@/core/ui/feedback/lesson-status';
import { offersCancel, salesCancelRights } from '@/sales/sales/lesson-actions/cancel-by';
import { canChangeLesson } from '@/sales/sales/lesson-actions/lesson-actions-api';
import { SalesLessonActions } from '@/sales/sales/lesson-actions/SalesLessonActions';
import { SalesRescheduleSheet } from '@/sales/sales/lesson-actions/SalesRescheduleSheet';

interface SalesLessonSheetProps {
  lesson: SalesScheduleLesson | null;
  onClose: () => void;
  /** Opened from «تفاصيل الطالب» of this student: their name does not open that screen again. */
  studentId?: string;
}

/**
 * The salesperson's «تفاصيل الحلقة» (PR #261): «ادخل الحلقة» while the lesson runs (she joins as the
 * classroom assistant, docs/16). On ANY open lesson not over yet (owner 2026-10-28, docs/16 rows 37, 37b)
 * «تغيير الموعد» and «إلغاء الحلقة» too, each with its key, and «تأكيد الحلقة» while it is scheduled (lessons.confirm;
 * then it reads «مؤكدة»), laid out by SalesLessonActions (docs/07 §6: one filled button); «للاطلاع فقط» only when none is allowed. Any student's name opens «تفاصيل الطالب» (the
 * admin's student file in the admin tree; not from that student's own file, `studentId`). Never a series, an outcome or a report.
 */
export function SalesLessonSheet({ lesson, onClose, studentId }: SalesLessonSheetProps) {
  const now = useNow();
  const can = usePermissions();
  const holdsConfirm = useHolds('lessons.confirm');
  const { required } = useLessonStatusText();
  const [moving, setMoving] = useState<SalesScheduleLesson | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const justConfirmed = lesson !== null && lesson.id === confirmedId;
  const shown = lesson && justConfirmed ? { ...lesson, status: 'confirmed' as const } : lesson;
  const moves = shown ? canChangeLesson(shown, { now, can }).reschedule : false;
  const cancelInput = { now, holds: can('lessons.cancel'), required };
  const cancels = shown ? offersCancel(salesCancelRights(shown, cancelInput)) : false;
  // «تأكيد الحلقة» only while the academy requires one (settings.lesson_confirmation_required).
  const confirmInput = { now, holds: holdsConfirm };
  const confirmable = shown ? required && canSalesConfirm(shown, confirmInput) : false;
  return (
    <LessonDetailsSheet
      lesson={shown}
      role="sales"
      onClose={onClose}
      readOnly={!moves && !cancels && !confirmable && !justConfirmed}
      hereStudentId={studentId}
      actions={(l) => (
        <>
          {isRunningLesson(l, now) ? <JoinClassroomButton lesson={l} /> : null}
          {justConfirmed ? <Note>{t.sales.lessonActions.confirmed}</Note> : null}
          <SalesLessonActions
            lesson={l}
            onReschedule={setMoving}
            onConfirmed={confirmable ? () => setConfirmedId(l.id) : undefined}
          />
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
