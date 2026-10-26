import { applyLessonEvent, clockTime, isOpenLesson, lessonStatusStyle, type LessonView } from '@ab/shared';
import { Linking, View } from 'react-native';
import { JoinClassroomButton } from '@/classroom/JoinClassroomButton';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { usePlatformClassroom } from '@/core/lib/query/public-config';
import { LiveBadge } from '@/live/LiveBadge';
import { shape, type, useTheme } from '@/theme';
import { durationLabel, studentNames } from '@/today/lesson-text';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import type { ReportAction } from '../lib/day';

const reportLabel: Record<ReportAction, string> = { open: t.reports.open, edit: t.reports.resume, view: t.reports.view };

export interface TeacherLessonCardProps {
  lesson: LessonView;
  /** The teacher's zone: the lesson's time on her own clock. */
  tz: string;
  report: ReportAction | null;
  busy: boolean;
  error?: string;
  onConfirm: () => void;
  onReport: () => void;
}

/** «16:00 · 45 دقيقة · عند الطالب 15:00» on the teacher's clock, the student's when it differs. */
function timeLine(lesson: LessonView, tz: string): string {
  const start = new Date(lesson.starts_at);
  const theirs = [...new Set(lesson.students.map((s) => s.tz))]
    .filter((z) => z && clockTime(start, z) !== clockTime(start, tz))
    .map((z) => t.teacherDash.studentTime.replace('{time}', clockTime(start, z)));
  return [clockTime(start, tz), durationLabel(lesson), ...theirs].filter(Boolean).join(' · ');
}

/**
 * One of my lessons today (R-TCH-03): students, status, my time, «ادخل الحلقة» while it is open,
 * «تأكيد» when the API offers it, and the report once it has started. No cancel or move here:
 * the API gives a teacher neither (the web has «اقترح ميعاد تاني»). When the lesson's teacher holds it
 * in our classroom (lesson.platform_classroom, per-teacher meeting mode) the way in is the platform
 * classroom, not the lesson's fixed link.
 */
export function TeacherLessonCard(p: TeacherLessonCardProps) {
  const { color } = useTheme();
  const { lesson } = p;
  const auto = usePlatformClassroom(lesson.platform_classroom);
  const canConfirm = lesson.allowed_events.includes('confirm') && applyLessonEvent(lesson.status, 'confirm') !== null;
  const link = !auto && isOpenLesson(lesson.status) ? lesson.meeting_link : null;
  const needsConfirm = lesson.status === 'scheduled';
  return (
    <View
      style={{
        gap: 8,
        padding: 12,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: color.rule,
        borderStartWidth: needsConfirm ? 4 : 1,
        borderStartColor: needsConfirm ? color.act : color.rule,
        backgroundColor: color.raised,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <AppText
          style={{ flex: 1, fontFamily: type.ui[700], fontSize: type.size.base, lineHeight: type.lineHeight(type.size.base), color: color.ink }}
        >
          {studentNames(lesson)}
        </AppText>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <LiveBadge lesson={lesson} />
          <StatusChip {...lessonStatusStyle[lesson.status]} label={t.enums.lessonStatus[lesson.status]} size="sm" />
        </View>
      </View>
      <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink2, fontVariant: ['tabular-nums'] }}>
        {timeLine(lesson, p.tz)}
      </AppText>
      {p.error ? <ErrorLine message={p.error} /> : null}
      {auto ? <JoinClassroomButton lesson={lesson} /> : null}
      {link ? <Button variant="secondary" label={t.teacherDash.join} onPress={() => void Linking.openURL(link)} /> : null}
      {canConfirm ? <Button label={t.today.confirm} onPress={p.onConfirm} busy={p.busy} /> : null}
      {p.report ? (
        <Button variant={p.report === 'view' ? 'ghost' : 'primary'} label={reportLabel[p.report]} onPress={p.onReport} />
      ) : null}
    </View>
  );
}
