import type { LessonView } from '@ab/schedule';
import { useRef, useState } from 'react';
import { useFocusOnChange } from '@ab/web-kit/components/ui/overlay/use-focus-on-change';
import { AdminCourseChange } from '@/features/teaching/booking/course-change/AdminCourseChange';
import { ClassroomActions } from '@/features/teaching/classroom/join/ClassroomActions';
import { FeedbackRequestButton } from '@/features/teaching/feedback/FeedbackRequestButton';
import { LessonReportLinks } from '@/features/reporting/reports/history/LessonReportLinks';
import { LessonFilesSection } from '@/features/teaching/lesson-files';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { CancelForm } from '@/features/teaching/schedule/reschedule/CancelForm';
import { CorrectOutcome } from '@/features/teaching/schedule/correct/CorrectOutcome';
import { Drawer } from '@ab/web-kit/components/ui/overlay/Drawer';
import { EditTimeForm } from '@/features/teaching/schedule/edit-time/EditTimeForm';
import { LessonActions } from './LessonActions';
import { LessonDetails } from './LessonDetails';
import { LessonInvoice } from './LessonInvoice';
import { studentNames } from './lessons';
import { MakeupAction } from '@/features/teaching/schedule/reschedule/MakeupAction';
import { ProposalBox } from '@/features/teaching/schedule/reschedule/proposals/ProposalBox';
import { RescheduleForm } from '@/features/teaching/schedule/reschedule/RescheduleForm';

export interface LessonDrawerProps {
  lesson: LessonView;
  onClose: () => void;
  /** Toast after a write; the drawer closes itself. */
  onDone: (message: string) => void;
}

type Mode = 'view' | 'cancel' | 'reschedule' | 'editTime' | 'courseChange';
const LABEL: Record<Mode, string> = {
  view: t.lessons.details,
  cancel: t.lessons.cancelTitle,
  reschedule: t.lessons.rescheduleTitle,
  editTime: t.lessons.timeEdit.title,
  courseChange: t.booking.courseChange.changeDays,
};

/** The drawer's form; «اختر موعدًا آخر» of a family's request opens the move on the asked week. */
function useDrawerMode() {
  const [mode, setMode] = useState<Mode>('view');
  const [near, setNear] = useState<string | undefined>(undefined);
  const reschedule = (at?: string) => {
    setNear(at);
    setMode('reschedule');
  };
  return { mode, setMode, near, reschedule };
}

/** «تصحيح حالة الحلقة» under the actions (owner 2026-11-03; the admin's page, lessons.write). */
function CorrectSlot({ lesson }: { lesson: LessonView }) {
  return <CorrectOutcome lesson={{ ...lesson, auto: lesson.auto_held === true }} area="admin" />;
}

/**
 * Admin lesson drawer (R-SCH-03, R-SCH-07, R-SCH-08): details, a teacher's pending proposal, then
 * confirm / attendance, «تغيير الميعاد» (slot picker, conflict → message → another slot) and
 * «إلغاء الحلقة» (scope, by whom, reason), the booking's invoice and «حجز تعويضي» on a missed
 * lesson (R-SCH-10, R-PAY-03), «تصحيح حالة الحلقة» on an ended or auto-settled one (owner 2026-11-03), «عدّل الوقت» (same lesson, new time; R-SCH-11) and, on an assistant course's lesson, «تغيير أيام الحلقات» (owner 2026-10-18). Switching form moves focus to it (it replaced the button that had focus).
 */
export function LessonDrawer({ lesson, onClose, onDone }: LessonDrawerProps) {
  const { mode, setMode, near, reschedule } = useDrawerMode();
  const panel = useRef<HTMLDivElement>(null);
  useFocusOnChange(panel, mode);
  const done = (message: string) => {
    onDone(message);
    onClose();
  };
  return (
    <Drawer title={studentNames(lesson) || t.lessons.details} onClose={onClose}>
      <div ref={panel} role="group" tabIndex={-1} aria-label={LABEL[mode]} className="grid gap-5 outline-none">
        {mode === 'view' && (
          <>
            <LessonDetails lesson={lesson} onEditTime={() => setMode('editTime')} />
            <ClassroomActions lesson={lesson} />
            <LessonInvoice lesson={lesson} />
            <ProposalBox lesson={lesson} onDone={done} onPickOther={reschedule} />
            <LessonReportLinks lesson={lesson} role="admin" />
            <LessonFilesSection lessonId={lesson.id} />
            <LessonActions
              lesson={lesson}
              proposalLeads={Boolean(lesson.pending_proposal)}
              onDone={done}
              onCancel={() => setMode('cancel')}
              onReschedule={() => reschedule()}
              onChangeCourse={() => setMode('courseChange')}
            />
            <CorrectSlot lesson={lesson} />
            <MakeupAction lesson={lesson} />
            <FeedbackRequestButton lesson={lesson} />
          </>
        )}
        {mode === 'cancel' && (
          <CancelForm lesson={lesson} onBack={() => setMode('view')} onDone={done} />
        )}
        {mode === 'reschedule' && (
          <RescheduleForm lesson={lesson} near={near} onBack={() => setMode('view')} onDone={done} />
        )}
        {mode === 'editTime' && <EditTimeForm lesson={lesson} onBack={() => setMode('view')} onDone={done} />}
        {mode === 'courseChange' && lesson.course_subscription_id && (
          <AdminCourseChange subscriptionId={lesson.course_subscription_id} onBack={() => setMode('view')} onDone={done} />
        )}
      </div>
    </Drawer>
  );
}
