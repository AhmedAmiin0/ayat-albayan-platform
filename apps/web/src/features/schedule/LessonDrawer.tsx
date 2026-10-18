import type { LessonView } from '@ab/shared';
import { useRef, useState } from 'react';
import { useFocusOnChange } from '@/components/ui/use-focus-on-change';
import { AdminCourseChange } from '@/features/booking/course-change/AdminCourseChange';
import { ClassroomActions } from '@/features/classroom/ClassroomActions';
import { FeedbackRequestButton } from '@/features/feedback/FeedbackRequestButton';
import { LessonReportLinks } from '@/features/reports/LessonReportLinks';
import { t } from '@/lib/i18n';
import { CancelForm } from './CancelForm';
import { Drawer } from './Drawer';
import { EditTimeForm } from './EditTimeForm';
import { LessonActions } from './LessonActions';
import { LessonDetails } from './LessonDetails';
import { LessonInvoice } from './LessonInvoice';
import { studentNames } from './lessons';
import { MakeupAction } from './MakeupAction';
import { ProposalBox } from './ProposalBox';
import { RescheduleForm } from './RescheduleForm';

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

/**
 * Admin lesson drawer (R-SCH-03, R-SCH-07, R-SCH-08): details, a teacher's pending proposal, then
 * confirm / attendance, «تغيير الميعاد» (slot picker, conflict → message → another slot) and
 * «إلغاء الحلقة» (scope, by whom, reason), the booking's invoice and «حجز تعويضي» on a missed
 * lesson (R-SCH-10, R-PAY-03), «عدّل الوقت» (same lesson, new time; R-SCH-11) and, on an assistant course's lesson, «تغيير أيام الحلقات» (owner 2026-10-18). Switching form moves focus to it (it replaced the button that had focus).
 */
export function LessonDrawer({ lesson, onClose, onDone }: LessonDrawerProps) {
  const [mode, setMode] = useState<Mode>('view');
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
            <ProposalBox lesson={lesson} onDone={done} />
            <LessonReportLinks lesson={lesson} role="admin" />
            <LessonActions
              lesson={lesson}
              onDone={done}
              onCancel={() => setMode('cancel')}
              onReschedule={() => setMode('reschedule')}
              onChangeCourse={() => setMode('courseChange')}
            />
            <MakeupAction lesson={lesson} />
            <FeedbackRequestButton lesson={lesson} />
          </>
        )}
        {mode === 'cancel' && <CancelForm lesson={lesson} onBack={() => setMode('view')} onDone={done} />}
        {mode === 'reschedule' && <RescheduleForm lesson={lesson} onBack={() => setMode('view')} onDone={done} />}
        {mode === 'editTime' && <EditTimeForm lesson={lesson} onBack={() => setMode('view')} onDone={done} />}
        {mode === 'courseChange' && lesson.course_subscription_id && (
          <AdminCourseChange subscriptionId={lesson.course_subscription_id} onBack={() => setMode('view')} onDone={done} />
        )}
      </div>
    </Drawer>
  );
}
