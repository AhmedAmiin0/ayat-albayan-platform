import type { PlanAction, WayIn } from '@ab/client-core';
import type { LessonView } from '@ab/shared';
import type { ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/form/button';
import { StaffJoinButton } from '@/features/teaching/classroom';
import { REPORT_STAGE_LABEL, ReportLink, reportFormHref } from '@/features/reporting/reports';
import { t } from '@/lib/i18n/i18n';
import { TeacherConfirm } from '@/features/teaching/teacher/lessons/TeacherConfirm';
import type { TeacherPlan } from './use-teacher-plan';

export interface TeacherLessonLeadProps {
  action: PlanAction;
  lesson: LessonView;
  plan: TeacherPlan;
  /** filled: the lead of the hero and the drawer card, or a live join on a row (docs/07 §6). */
  look: { filled: boolean; size: 'md' | 'lg' };
  onDone: (message: string) => void;
}

type View = (p: TeacherLessonLeadProps) => ReactNode;

const variantOf = (p: TeacherLessonLeadProps) => (p.look.filled ? 'primary' : 'secondary');

/** «ادخل الحلقة» by the way in (owner Q3): our classroom, or her own link of the lesson. */
const JOIN: Record<WayIn, View> = {
  room: (p) => <StaffJoinButton lesson={p.lesson} size={p.look.size} variant={variantOf(p)} />,
  link: (p) => (
    <a
      href={p.lesson.meeting_link ?? undefined}
      target="_blank"
      rel="noreferrer"
      className={buttonVariants({ variant: variantOf(p), size: p.look.size })}
    >
      {t.teacherDash.join}
    </a>
  ),
};

const LEAD: Record<PlanAction, View> = {
  join: (p) => JOIN[p.plan.way](p),
  confirm: (p) => (
    <TeacherConfirm lesson={p.lesson} variant={variantOf(p)} size={p.look.size} onDone={p.onDone} />
  ),
  report: (p) => (
    <ReportLink
      href={reportFormHref({ role: 'teacher', lessonId: p.lesson.id, studentId: '' })}
      size={p.look.size}
      variant={variantOf(p)}
    >
      {REPORT_STAGE_LABEL[p.plan.stage ?? 'write']}
    </ReportLink>
  ),
  // «إلغاء الحلقة» is never a lead: the card draws it last, danger-quiet (TeacherLessonPeers).
  cancel: () => null,
};

/** One action of the teacher's lesson (docs/48 LEAD lookup): the row, the hero and the card. */
export function TeacherLessonLead(props: TeacherLessonLeadProps) {
  return LEAD[props.action](props);
}
