import { t } from '@ab/mobile-kit';
import { CourseStopForm } from '@/students/course-actions/CourseStopForm';
import { CoursePauseForm } from '@/students/course-pause/CoursePauseForm';
import { PauseSheetFrame } from '@/students/course-pause/PauseSheetFrame';

export type StatusAsk = 'pause' | 'stop' | null;

interface StatusSheetsProps {
  studentId: string;
  /** The server's current package, which cancel stops. */
  subscriptionId: string | null;
  ask: StatusAsk;
  onClose: () => void;
  /** Done: what changed, said under the pills. */
  onDone: (text: string) => void;
  /** The guardian's phone: the stop's done block opens the chat. */
  chatPhone?: string | undefined;
}

/** Status pills open the same pause and cancel forms, never a bare status change. */
export function StatusSheets(props: StatusSheetsProps) {
  const { studentId, subscriptionId, ask, onClose, onDone } = props;
  const stopping = ask === 'stop' && subscriptionId !== null;
  return (
    <>
      <PauseSheetFrame open={ask === 'pause'} title={t.coursePause.title} onClose={onClose}>
        <CoursePauseForm
          studentId={studentId}
          onClose={onClose}
          onDone={() => onDone(t.coursePause.done)}
        />
      </PauseSheetFrame>
      <PauseSheetFrame open={stopping} title={t.courseActions.stop.title} onClose={onClose}>
        {subscriptionId ? (
          <CourseStopForm
            sub={{ studentId, subscriptionId }}
            onClose={onClose}
            onDone={onDone}
            chatPhone={props.chatPhone}
          />
        ) : null}
      </PauseSheetFrame>
    </>
  );
}
