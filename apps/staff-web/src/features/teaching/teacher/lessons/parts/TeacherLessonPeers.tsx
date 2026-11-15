import { teacherCanPropose, type PlanAction } from '@ab/client-core';
import { isOpenLesson, type LessonView } from '@ab/shared';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/form/button';
import { ButtonRow } from '@/components/ui/layout/button-row';
import { t } from '@/lib/i18n/i18n';
import { TeacherCancelDialog } from '@/features/teaching/teacher/lessons/TeacherCancelDialog';
import { TeacherProposal } from '@/features/teaching/teacher/proposals/TeacherProposal';
import { TeacherLessonLead } from './TeacherLessonLead';
import type { TeacherPlan } from './use-teacher-plan';

export interface TeacherLessonPeersProps {
  lesson: LessonView;
  plan: TeacherPlan;
  /** The teacher's zone (the proposal form's clock). */
  tz: string;
  /** Her profile link: a peer only on a static lesson with no link of its own (owner Q3). */
  fallbackLink: string | null;
  onDone: (message: string) => void;
}

type Form = 'cancel' | 'propose' | null;

/**
 * In room mode the card draws the classroom itself (StaffJoinButton), never as a peer; it also
 * draws the reports itself, one per student (docs/49 «Drawer rule»).
 */
const drawnElsewhere = (plan: TeacherPlan): Record<PlanAction, boolean> => ({
  join: plan.way === 'room',
  confirm: false,
  report: true,
  cancel: true,
});
const drawnHere = (plan: TeacherPlan) => (a: PlanAction) => !drawnElsewhere(plan)[a];

/** Her profile link beside the classroom: a static lesson without a link of its own. */
const fallbackOf = (p: TeacherLessonPeersProps): string | null =>
  p.plan.way === 'room' && !p.plan.platform && isOpenLesson(p.lesson.status) ? p.fallbackLink : null;

/**
 * The card's other actions (docs/48 lessonPlan peers), one secondary ButtonRow: the join after the
 * end or her own link, «سأحضر», the report, «اقترح موعدًا آخر»; then «إلغاء الحلقة» (danger-quiet,
 * a reason in a dialog that also offers the proposal while none is pending, owner Q5).
 */
export function TeacherLessonPeers(props: TeacherLessonPeersProps) {
  const { lesson, plan, tz, onDone } = props;
  const [form, setForm] = useState<Form>(null);
  const canPropose = teacherCanPropose(lesson);
  const fallback = fallbackOf(props);
  const close = () => setForm(null);
  const look = { filled: false, size: 'lg' } as const;
  return (
    <>
      <ButtonRow>
        {plan.peers.filter(drawnHere(plan)).map((action) => (
          <TeacherLessonLead key={action} {...{ action, lesson, plan, look, onDone }} />
        ))}
        {fallback && <ProfileLink href={fallback} />}
        {canPropose && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            aria-haspopup="dialog"
            onClick={() => setForm('propose')}
          >
            {t.teacherDash.proposeReschedule}
          </Button>
        )}
      </ButtonRow>
      {plan.peers.includes('cancel') && (
        <Button type="button" variant="danger-quiet" size="lg" onClick={() => setForm('cancel')}>
          {t.teacherBoard.cancel}
        </Button>
      )}
      {form === 'cancel' && (
        <TeacherCancelDialog
          lessonId={lesson.id}
          canPropose={canPropose}
          onPropose={() => setForm('propose')}
          onClose={close}
          onDone={onDone}
        />
      )}
      <TeacherProposal lesson={lesson} tz={tz} open={form === 'propose'} onClose={close} onDone={onDone} />
    </>
  );
}

const SECONDARY = { variant: 'secondary', size: 'lg' } as const;

function ProfileLink({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={buttonVariants(SECONDARY)}>
      {t.teacherDash.joinLink}
    </a>
  );
}
