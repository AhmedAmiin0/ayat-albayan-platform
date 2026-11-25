import { lessonWhenAt } from '@ab/shared';
import type { LessonProposalView, LessonView } from '@ab/schedule';
import { NuqtaGlyph, t, useClock, useViewerTz } from '@ab/web-kit';
import { studentTimes } from '@/features/teaching/schedule/lesson/lessons';
import type { ProposalWords } from './proposal-words';

interface ProposalAskedProps {
  lesson: LessonView;
  proposal: LessonProposalView;
  words: ProposalWords;
}

/**
 * What was asked (canvas LessonXWebStaff): the time on the viewer's clock, the student's own
 * clock and when it was sent under it, then the asker's note.
 */
export function ProposalAsked({ lesson, proposal, words }: ProposalAskedProps) {
  const clock = { ...useClock(), tz: useViewerTz() };
  const asked = new Date(proposal.proposed_starts_at);
  const when = `${lessonWhenAt(asked, clock)} ${t.schedule.viewerTime}`;
  const sent = t.lessons.proposal.sentAt.replace(
    '{when}',
    lessonWhenAt(new Date(proposal.created_at), clock),
  );
  const at = { starts_at: proposal.proposed_starts_at, students: lesson.students };
  const line = [...studentTimes(at, clock.tz, clock), sent].join(' · ');
  return (
    <>
      <p className="flex items-start gap-2 text-sm font-semibold">
        <NuqtaGlyph shape="half" className="mt-1.5 text-act" />
        <span>{words.pending.replace('{when}', when)}</span>
      </p>
      <p className="text-xs text-ink-2">{line}</p>
      {proposal.note && (
        <p className="text-sm text-ink-2">{words.note.replace('{note}', proposal.note)}</p>
      )}
    </>
  );
}
