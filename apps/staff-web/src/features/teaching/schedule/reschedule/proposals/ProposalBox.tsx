import { isFamilyRequest, type LessonView } from '@ab/schedule';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { t } from '@ab/web-kit';
import {
  approveProposal,
  conflictsOf,
  LESSONS_KEY,
  rejectProposal,
} from '@/features/teaching/schedule/api';
import { ConflictNotice } from '@/features/teaching/schedule/reschedule/ConflictNotice';
import { ProposalAnswer } from './ProposalAnswer';
import { ProposalAsked } from './ProposalAsked';
import { proposalWords } from './proposal-words';

const P = t.lessons.proposal;

export interface ProposalBoxProps {
  lesson: LessonView;
  /** Toast text after the answer; the drawer closes. */
  onDone: (message: string) => void;
  /** Opens the move form on this week, at the asked time. */
  onPickOther: (near: string) => void;
}

/** Accepting is a reschedule, so a clash shows the usual notice and needs a reason (R-SCH-08). */
export function ProposalBox({ lesson, onDone, onPickOther }: ProposalBoxProps) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const proposal = lesson.pending_proposal;
  const words = proposalWords(isFamilyRequest(proposal));
  const done = async (message: string) => {
    await queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
    onDone(message);
  };
  const approve = useMutation({
    mutationFn: (override?: string) => approveProposal({ id: proposal?.id ?? '', override }),
    onSuccess: () => done(words.approved),
  });
  const reject = useMutation({
    mutationFn: () => rejectProposal({ id: proposal?.id ?? '', note: note.trim() || undefined }),
    onSuccess: () => done(words.rejected),
  });
  if (!proposal) return null;
  const conflicts = conflictsOf(approve.error);
  const busy = approve.isPending || reject.isPending;
  return (
    <section aria-label={P.title} className="grid gap-3 rounded-md bg-act-soft px-4 py-3.5">
      <ProposalAsked lesson={lesson} proposal={proposal} words={words} />
      {conflicts ? (
        <ConflictNotice
          conflicts={conflicts}
          teacherTz={lesson.teacher.tz}
          busy={busy}
          onChangeSlot={() => approve.reset()}
          onOverride={(reason) => approve.mutate(reason)}
        />
      ) : (
        <ProposalAnswer
          words={words}
          busy={busy}
          error={approve.error ?? reject.error}
          note={{ value: note, onChange: setNote }}
          onApprove={() => approve.mutate(undefined)}
          onReject={() => reject.mutate()}
          onPickOther={() => onPickOther(proposal.proposed_starts_at)}
        />
      )}
    </section>
  );
}
