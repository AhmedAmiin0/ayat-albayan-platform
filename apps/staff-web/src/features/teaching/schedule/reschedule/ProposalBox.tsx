import { isFamilyRequest, type LessonView, lessonWhenAt } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { t } from '@/lib/i18n/i18n';
import { useViewerTz } from '@/lib/viewer-tz';
import {
  approveProposal,
  conflictsOf,
  LESSONS_KEY,
  rejectProposal,
} from '@/features/teaching/schedule/api';
import { ConflictNotice } from './ConflictNotice';
import { ProposalAnswer } from './ProposalAnswer';
import { useClock } from '@/lib/clock';
import { proposalWords } from './proposal-words';

export interface ProposalBoxProps {
  lesson: LessonView;
  /** Toast text after the answer; the drawer closes. */
  onDone: (message: string) => void;
}

/**
 * The «اقترح موعدًا آخر» of the teacher, or the family's «اطلب موعدًا آخر» (owner 2026-11-17),
 * waiting on this lesson (R-SCH-08): the time asked, the note, «وافق» (a reschedule, so a clash
 * shows the usual notice and needs a reason) or «ارفض» — a family's with a note they read.
 */
export function ProposalBox({ lesson, onDone }: ProposalBoxProps) {
  const clock = useClock();
  const tz = useViewerTz();
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
  const when = `${lessonWhenAt(new Date(proposal.proposed_starts_at), { tz, ...clock })} ${t.schedule.viewerTime}`;

  return (
    <section aria-label={t.lessons.proposal.title} className="grid gap-3 rounded-md bg-act-soft px-4 py-3.5">
      <p className="flex items-start gap-2 text-sm font-semibold">
        <NuqtaGlyph shape="half" className="mt-1.5 text-act" />
        <span>{words.pending.replace('{when}', when)}</span>
      </p>
      {proposal.note && <p className="text-sm text-ink-2">{words.note.replace('{note}', proposal.note)}</p>}
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
        />
      )}
    </section>
  );
}
