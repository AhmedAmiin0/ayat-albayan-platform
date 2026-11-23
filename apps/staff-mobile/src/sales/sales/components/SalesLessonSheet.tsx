import { canSalesConfirm, isRunningLesson, type SalesScheduleLesson } from '@ab/shared';
import { useState } from 'react';
import { LessonDetailsSheet } from '@/calendar';
import { JoinClassroomButton } from '@/classroom';
import { useHolds, usePermissions, t, useNow } from '@ab/mobile-kit';
import { Note } from '@/more';
import { useLessonStatusText } from '@/core/ui/feedback/lesson-status';
import { offersCancel, salesCancelRights } from '@/sales/sales/lesson-actions/cancel-by';
import { canChangeLesson } from '@/sales/sales/lesson-actions/lesson-actions-api';
import { SalesLessonActions } from '@/sales/sales/lesson-actions/SalesLessonActions';
import { SalesRescheduleSheet } from '@/sales/sales/lesson-actions/SalesRescheduleSheet';

interface SalesLessonSheetProps {
  lesson: SalesScheduleLesson | null;
  onClose: () => void;
  /** Opened from this student's details, so their name does not reopen that screen. */
  studentId?: string;
}

/** Sales lesson details (docs/16 rows 37, 37b); never a series, an outcome or a report. */
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
  // Confirm only while settings.lesson_confirmation_required is on.
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
