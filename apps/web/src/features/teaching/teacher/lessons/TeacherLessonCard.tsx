import type { PlanAction } from '@ab/client-core';
import { clockOf, type LessonView } from '@ab/shared';
import { LessonReportLinks } from '@/features/reporting/reports';
import { StaffJoinButton } from '@/features/teaching/classroom';
import { LessonActions, studentNames } from '@/features/teaching/schedule';
import { useClock } from '@/lib/clock';
import { useLessonStatusText } from '@/lib/settings/lesson-status-text';
import { cn } from '@/lib/utils';
import { TeacherCardHead } from './parts/TeacherCardHead';
import { TeacherLessonLead } from './parts/TeacherLessonLead';
import { TeacherLessonPeers } from './parts/TeacherLessonPeers';
import { teacherWord } from './parts/teacher-word';
import { useTeacherPlan } from './parts/use-teacher-plan';

export interface TeacherLessonCardProps {
  lesson: LessonView;
  /** The teacher's zone: every time on the card is hers. */
  tz: string;
  /** Her profile link: a peer on a static lesson with no link of its own (R-LES-01, owner Q3). */
  fallbackLink: string | null;
  onDone: (message: string) => void;
  /** false in a list of cards (the week tab): the lead is drawn secondary (docs/07 §6). */
  leadFilled?: boolean;
}

/** The card draws the reports itself, one per student (docs/49 «Drawer rule»), never as a lead. */
const cardLead = (lead: PlanAction | null) => (lead === 'report' ? null : lead);

/**
 * One lesson for the teacher (R-TCH-03, R-SCH-08; docs/48): the head, ONE filled lead from
 * lessonPlan (join while live, «سأحضر», the report), the peers, and the outcomes only after the
 * start. Only this card lists the reports, one control per student (docs/49 «Drawer rule»).
 * The way in follows wayIn (owner Q3): our classroom (with «افتح الحلقة الآن» while early)
 * on a platform lesson or one with no link of its own; her own link otherwise, and then no
 * classroom and no «انسخ رابط الطالب». No family «تأكيد», no «اعتذر مسبقًا» (owner Q4).
 */
export function TeacherLessonCard(props: TeacherLessonCardProps) {
  const { lesson, tz, fallbackLink, onDone, leadFilled = true } = props;
  const clock = useClock();
  const plan = useTeacherPlan(lesson);
  const status = useLessonStatusText().chip(lesson.status);
  const word = teacherWord(lesson, { now: plan.now, status });
  const room = plan.way === 'room';
  const lead = cardLead(plan.lead);
  return (
    <article
      aria-label={`${clockOf(new Date(lesson.starts_at), { tz, ...clock })} ${studentNames(lesson)}`}
      className={cn(
        'grid gap-3 border-b border-rule py-4',
        word.tone === 'act' && 'border-s-4 border-s-act ps-3',
      )}
    >
      <TeacherCardHead lesson={lesson} tz={tz} word={word} room={room} />
      {lead && (
        <TeacherLessonLead
          {...{ action: lead, lesson, plan, onDone }}
          look={{ filled: leadFilled, size: 'lg' }}
        />
      )}
      <LessonReportLinks
        lesson={lesson}
        role="teacher"
        size="lg"
        filled={plan.lead === 'report' && leadFilled}
      />
      {room && lead !== 'join' && <StaffJoinButton lesson={lesson} size="lg" variant="secondary" />}
      <TeacherLessonPeers {...{ lesson, plan, tz, fallbackLink, onDone }} />
      <LessonActions lesson={lesson} onDone={onDone} size="lg" teacher />
    </article>
  );
}
