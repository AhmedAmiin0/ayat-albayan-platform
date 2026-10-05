import { isOpenLesson, lessonWhenText, type LessonView } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { usePhone } from '@/components/ui/use-narrow';
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
 * that opens the form (open lessons only): inline in the card from 640px, a full-screen Dialog on
 * phones (owner, 2026-10-05: no inline form bars on the phone).
 */
export function TeacherProposal({ lesson, tz, onDone }: TeacherProposalProps) {
  const [proposing, setProposing] = useState(false);
  const phone = usePhone();
  const proposal = lesson.pending_proposal;
  if (proposal) {
    const when = lessonWhenText(new Date(proposal.proposed_starts_at), tz, locale);
    return <p className="text-sm text-act">{t.teacherDash.propose.pending.replace('{when}', when)}</p>;
  }
  if (!isOpenLesson(lesson.status)) return null;
  const form = (
    <ProposeForm
      lesson={lesson}
      tz={tz}
      bare={phone}
      onBack={() => setProposing(false)}
      onDone={(message) => {
        setProposing(false);
        onDone(message);
      }}
    />
  );
  if (proposing && !phone) return form;
  return (
    <>
      <Button type="button" variant="ghost" size="lg" className="justify-self-start" aria-haspopup={phone ? 'dialog' : undefined} onClick={() => setProposing(true)}>
        {t.teacherDash.proposeReschedule}
      </Button>
      {proposing && (
        <Dialog title={t.teacherDash.propose.title} onClose={() => setProposing(false)}>
          {form}
        </Dialog>
      )}
    </>
  );
}
