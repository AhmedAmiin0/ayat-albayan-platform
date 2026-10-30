import { applyLessonEvent, isOpenLesson, type LessonView } from '@ab/shared';
import { Linking, View } from 'react-native';
import { JoinClassroomButton, useJoinOpen } from '@/classroom';
import { t } from '@/core/lib/i18n/i18n';
import { ButtonRow } from '@/core/ui/actions';
import { Button, type ButtonVariant } from '@/core/ui/primitives/Button';
import type { ReportAction } from '../lib/day';

const reportLabel: Record<ReportAction, string> = { open: t.reports.open, edit: t.reports.resume, view: t.reports.view };

interface TeacherLessonActionsProps {
  lesson: LessonView;
  /** The lesson's teacher holds it in our classroom (platform_classroom): the way in is the classroom. */
  auto: boolean;
  report: ReportAction | null;
  busy: boolean;
  onConfirm: () => void;
  onReport: () => void;
}

type Act = 'link' | 'confirm' | 'report';

interface Plan {
  /** The ONE filled button alone on top (the live classroom is JoinClassroomButton's own). */
  lead: 'join' | 'confirm' | 'report' | null;
  /** The secondary peers of the ButtonRow, in reading order. */
  peers: Act[];
}

/** Which button leads: the live classroom, else «تأكيد», else writing the report; the rest are peers. */
export function cardPlan(p: { joinLive: boolean; link: boolean; canConfirm: boolean; report: ReportAction | null }): Plan {
  const writes = p.report === 'open' || p.report === 'edit';
  const lead = p.joinLive ? 'join' : p.canConfirm ? 'confirm' : writes ? 'report' : null;
  const offered: [Act, boolean][] = [
    ['link', p.link],
    ['confirm', p.canConfirm && lead !== 'confirm'],
    ['report', p.report !== null && lead !== 'report'],
  ];
  return { lead, peers: offered.filter(([, on]) => on).map(([act]) => act) };
}

/**
 * The card's buttons (docs/07 §6 «الأزرار»): ONE filled button alone on top (cardPlan), the rest as
 * secondary peers in ONE ButtonRow (the fixed link's «ادخل الحلقة», «تأكيد», the report); a waiting
 * classroom join (outlined, off, with its hint) sits under the row.
 */
export function TeacherLessonActions({ lesson, auto, report, busy, onConfirm, onReport }: TeacherLessonActionsProps) {
  const joinLive = useJoinOpen(lesson) && auto;
  const canConfirm = lesson.allowed_events.includes('confirm') && applyLessonEvent(lesson.status, 'confirm') !== null;
  const link = !auto && isOpenLesson(lesson.status) ? lesson.meeting_link : null;
  const plan = cardPlan({ joinLive, link: link !== null, canConfirm, report });
  const button = (act: Act, variant: ButtonVariant) => {
    if (act === 'confirm') return <Button key={act} variant={variant} label={t.today.confirm} onPress={onConfirm} busy={busy} />;
    if (act === 'report' && report) return <Button key={act} variant={variant} label={reportLabel[report]} onPress={onReport} />;
    return link ? <Button key={act} variant={variant} label={t.teacherDash.join} onPress={() => void Linking.openURL(link)} /> : null;
  };
  return (
    <View style={{ gap: 8 }}>
      {auto ? <JoinClassroomButton lesson={lesson} only="open" /> : null}
      {plan.lead === 'confirm' || plan.lead === 'report' ? button(plan.lead, 'primary') : null}
      <ButtonRow testID="teacher-lesson-actions">{plan.peers.map((act) => button(act, 'secondary'))}</ButtonRow>
      {auto ? <JoinClassroomButton lesson={lesson} only="waiting" /> : null}
    </View>
  );
}
