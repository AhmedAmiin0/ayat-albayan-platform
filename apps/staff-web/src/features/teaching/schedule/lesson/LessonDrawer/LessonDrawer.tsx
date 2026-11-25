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
import { LessonActions } from '@/features/teaching/schedule/lesson/LessonActions';
import { LessonDetails } from '@/features/teaching/schedule/lesson/LessonDetails';
import { LessonInvoice } from '@/features/teaching/schedule/lesson/LessonInvoice';
import { studentNames } from '@/features/teaching/schedule/lesson/lessons';
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

/** A family's request opens the move on the asked week. */
function useDrawerMode() {
  const [mode, setMode] = useState<Mode>('view');
  const [near, setNear] = useState<string | undefined>(undefined);
  const reschedule = (at?: string) => {
    setNear(at);
    setMode('reschedule');
  };
  return { mode, setMode, near, reschedule };
}

/** Admin page only, needs lessons.write. */
function CorrectSlot({ lesson }: { lesson: LessonView }) {
  return <CorrectOutcome lesson={{ ...lesson, auto: lesson.auto_held === true }} area="admin" />;
}

/** Switching form moves focus to it, since it replaced the button that had focus. */
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
