import { lessonWhenAt } from '@ab/shared';
import type { LessonView } from '@ab/schedule';
import { Dialog, t, useClock } from '@ab/web-kit';
import { ProposeForm } from './ProposeForm';

export interface TeacherProposalProps {
  lesson: LessonView;
  /** The teacher's zone. */
  tz: string;
  open: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Offered only while open with no pending proposal (the API's 409 rule); always in a Dialog. */
export function TeacherProposal({ lesson, tz, open, onClose, onDone }: TeacherProposalProps) {
  const clock = useClock();
  const proposal = lesson.pending_proposal;
  const when = proposal && lessonWhenAt(new Date(proposal.proposed_starts_at), { tz, ...clock });
  return (
    <>
      {when && <p className="text-sm text-act">{t.teacherDash.propose.pending.replace('{when}', when)}</p>}
      {open && (
        <Dialog title={t.teacherDash.propose.title} onClose={onClose}>
          <ProposeForm
            lesson={lesson}
            tz={tz}
            bare
            onBack={onClose}
            onDone={(message) => {
              onClose();
              onDone(message);
            }}
          />
        </Dialog>
      )}
    </>
  );
}
