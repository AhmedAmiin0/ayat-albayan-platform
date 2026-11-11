import { isOpenLesson, type LessonView } from '@ab/shared';
import type { ReactNode } from 'react';
import { Linking, View } from 'react-native';
import { JoinClassroomButton, useJoinOpen } from '@/classroom';
import { t } from '@/core/lib/i18n/i18n';
import { ButtonRow } from '@/core/ui/actions';
import { Button, type ButtonVariant } from '@/core/ui/primitives/Button';
import type { ReportAction } from '@/teacher/lib/day';
import type { TeacherActs } from '@/teacher/lesson-actions';

const reportLabel: Record<ReportAction, string> = {
  open: t.reports.open,
  edit: t.reports.resume,
  view: t.reports.view,
};

interface TeacherLessonActionsProps {
  lesson: LessonView;
  /** Her lesson is in our classroom (platform_classroom): the way in is the classroom. */
  auto: boolean;
  report: ReportAction | null;
  /** «سأحضر» / «إلغاء الحلقة» (docs/46 C4, C3): useTeacherActs. */
  acts: TeacherActs;
  onReport: () => void;
}

type Act = 'link' | 'confirm' | 'report' | 'cancel';
type Draw = (variant: ButtonVariant) => ReactNode;

interface Plan {
  /** The ONE filled button alone on top (the live classroom is JoinClassroomButton's own). */
  lead: 'join' | 'confirm' | 'report' | null;
  /** The secondary peers of the ButtonRow, in reading order. */
  peers: Act[];
}

interface PlanInput {
  joinLive: boolean;
  link: boolean;
  /** «سأحضر» (teacherCanConfirm). */
  canConfirm: boolean;
  /** «إلغاء الحلقة» (teacherCanAct). */
  canCancel: boolean;
  report: ReportAction | null;
}

const leadOf = (p: PlanInput, writes: boolean): Plan['lead'] => {
  const order: [Plan['lead'], boolean][] = [
    ['join', p.joinLive],
    ['confirm', p.canConfirm],
    ['report', writes],
  ];
  return order.find(([, on]) => on)?.[0] ?? null;
};

/** Which button leads: the live classroom, else «سأحضر», else writing the report; rest peers. */
export function cardPlan(p: PlanInput): Plan {
  const lead = leadOf(p, p.report === 'open' || p.report === 'edit');
  const offered: [Act, boolean][] = [
    ['link', p.link],
    ['confirm', p.canConfirm && lead !== 'confirm'],
    ['report', p.report !== null && lead !== 'report'],
    ['cancel', p.canCancel],
  ];
  return { lead, peers: offered.filter(([, on]) => on).map(([act]) => act) };
}

/** The lead is one of the card's own buttons (the live classroom draws itself). */
const drawsLead = (lead: Plan['lead']): lead is 'confirm' | 'report' =>
  lead === 'confirm' || lead === 'report';

interface ButtonsInput {
  acts: TeacherActs;
  report: ReportAction | null;
  link: string | null;
  onReport: () => void;
}

/** Each act's button in the variant the plan gives it («إلغاء الحلقة» is always danger). */
function actButtons({ acts, report, link, onReport }: ButtonsInput): Record<Act, Draw> {
  const w = t.teacherBoard;
  const open = () => void (link ? Linking.openURL(link) : undefined);
  return {
    confirm: (v) => (
      <Button key="confirm" variant={v} label={w.confirm} onPress={acts.confirm} busy={acts.busy} />
    ),
    report: (v) =>
      report ? (
        <Button key="report" variant={v} label={reportLabel[report]} onPress={onReport} />
      ) : null,
    link: (v) =>
      link ? <Button key="link" variant={v} label={t.teacherDash.join} onPress={open} /> : null,
    cancel: () => (
      <Button key="cancel" variant="danger" label={w.cancel} onPress={acts.openCancel} />
    ),
  };
}

/**
 * The card's buttons (docs/07 §6 «الأزرار»): ONE filled button alone on top (cardPlan), the rest as
 * peers in ONE ButtonRow (the fixed link's «ادخل الحلقة», «سأحضر», the report, «إلغاء الحلقة» in
 * danger); a waiting classroom join (outlined, off, with its hint) sits under the row. The family's
 * «تأكيد» is not the teacher's (docs/46 D1): her «سأحضر» never changes the status.
 */
export function TeacherLessonActions(p: TeacherLessonActionsProps) {
  const { lesson, auto, report, acts } = p;
  const joinLive = useJoinOpen(lesson) && auto;
  const link = !auto && isOpenLesson(lesson.status) ? lesson.meeting_link : null;
  const { canConfirm, canCancel } = acts;
  const plan = cardPlan({ joinLive, link: link !== null, canConfirm, canCancel, report });
  const buttons = actButtons({ acts, report, link, onReport: p.onReport });
  return (
    <View style={{ gap: 8 }}>
      {auto ? <JoinClassroomButton lesson={lesson} only="open" /> : null}
      {drawsLead(plan.lead) ? buttons[plan.lead]('primary') : null}
      <ButtonRow testID="teacher-lesson-actions">
        {plan.peers.map((act) => buttons[act]('secondary'))}
      </ButtonRow>
      {auto ? <JoinClassroomButton lesson={lesson} only="waiting" /> : null}
    </View>
  );
}
