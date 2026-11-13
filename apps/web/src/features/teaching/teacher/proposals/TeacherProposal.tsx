import { type LessonView, lessonWhenAt } from '@ab/shared';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { useClock } from '@/lib/clock';
import { ProposeForm } from './ProposeForm';

export interface TeacherProposalProps {
  lesson: LessonView;
  /** The teacher's zone. */
  tz: string;
  /** Driven by the card: its «اقترح موعدًا آخر», or the cancel dialog's (owner Q5). */
  open: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}

/**
 * «اقترح موعدًا آخر» (R-SCH-08): the proposal waiting for the admin as one line, and the form in a
 * Dialog on every width (docs/48: no inline form in the card). The card offers it only while
 * teacherCanPropose holds (open, no pending proposal: the API's 409 rule).
 */
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
