import { lessonWhenText, type LessonView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { approveProposal, conflictsOf, lessonErrorText, LESSONS_KEY, rejectProposal } from './api';
import { ConflictNotice } from './ConflictNotice';
import { RIYADH_TZ } from './tz';

export interface ProposalBoxProps {
  lesson: LessonView;
  /** Toast text after the answer; the drawer closes. */
  onDone: (message: string) => void;
}

/**
 * The teacher's «اقترح ميعاد تاني» waiting on this lesson (R-SCH-08): the proposed time, the note,
 * «وافق» (a reschedule, so a clash shows the usual notice and needs a reason) or «ارفض».
 */
export function ProposalBox({ lesson, onDone }: ProposalBoxProps) {
  const queryClient = useQueryClient();
  const proposal = lesson.pending_proposal;
  const done = async (message: string) => {
    await queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
    onDone(message);
  };
  const approve = useMutation({
    mutationFn: (override?: string) => approveProposal({ id: proposal?.id ?? '', override }),
    onSuccess: () => done(t.lessons.proposal.approved),
  });
  const reject = useMutation({
    mutationFn: () => rejectProposal(proposal?.id ?? ''),
    onSuccess: () => done(t.lessons.proposal.rejected),
  });
  if (!proposal) return null;
  const conflicts = conflictsOf(approve.error);
  const busy = approve.isPending || reject.isPending;
  const when = `${lessonWhenText(new Date(proposal.proposed_starts_at), RIYADH_TZ, locale)} ${t.schedule.riyadhTime}`;

  return (
    <section aria-label={t.lessons.proposal.title} className="grid gap-3 rounded-md bg-act-soft px-4 py-3.5">
      <p className="flex items-start gap-2 text-sm font-semibold">
        <NuqtaGlyph shape="half" className="mt-1.5 text-act" />
        <span>{t.lessons.proposal.pending.replace('{when}', when)}</span>
      </p>
      {proposal.note && <p className="text-sm text-ink-2">{t.lessons.proposal.note.replace('{note}', proposal.note)}</p>}
      {conflicts ? (
        <ConflictNotice
          conflicts={conflicts}
          teacherTz={lesson.teacher.tz}
          busy={busy}
          onChangeSlot={() => approve.reset()}
          onOverride={(reason) => approve.mutate(reason)}
        />
      ) : (
        <>
          {(approve.isError || reject.isError) && <FormAlert>{lessonErrorText(approve.error ?? reject.error)}</FormAlert>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => approve.mutate(undefined)}>
              {t.lessons.proposal.approve}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => reject.mutate()}>
              {t.lessons.proposal.reject}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
