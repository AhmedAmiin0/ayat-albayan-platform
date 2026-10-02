import { isOpenLesson, lessonWhenText, type LessonView } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { ProposeForm } from './ProposeForm';

export interface TeacherProposalProps {
  lesson: LessonView;
  /** The teacher's zone. */
  tz: string;
  onDone: (message: string) => void;
}

/**
 * The card's «اقترح ميعاد تاني» (R-SCH-08): the proposal waiting for the admin, else the button
 * that opens the form (open lessons only).
 */
export function TeacherProposal({ lesson, tz, onDone }: TeacherProposalProps) {
  const [proposing, setProposing] = useState(false);
  const proposal = lesson.pending_proposal;
  if (proposal) {
    const when = lessonWhenText(new Date(proposal.proposed_starts_at), tz, locale);
    return <p className="text-sm text-act">{t.teacherDash.propose.pending.replace('{when}', when)}</p>;
  }
  if (!isOpenLesson(lesson.status)) return null;
  if (!proposing) {
    return (
      <Button type="button" variant="ghost" size="lg" className="justify-self-start" onClick={() => setProposing(true)}>
        {t.teacherDash.proposeReschedule}
      </Button>
    );
  }
  return (
    <ProposeForm
      lesson={lesson}
      tz={tz}
      onBack={() => setProposing(false)}
      onDone={(message) => {
        setProposing(false);
        onDone(message);
      }}
    />
  );
}
