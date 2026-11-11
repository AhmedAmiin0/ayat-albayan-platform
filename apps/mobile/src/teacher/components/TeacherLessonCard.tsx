import { clockTime, type ClockCycle, type LessonView } from '@ab/shared';
import { clockIn, useClockCycle } from '@/core/lib/clock';
import { View } from 'react-native';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { usePlatformClassroom } from '@/core/lib/query/public-config';
import { LiveBadge } from '@/live/LiveBadge';
import { shape, type, useTheme } from '@/theme';
import { durationLabel, studentNames } from '@/today';
import { AppText } from '@/core/ui/primitives/AppText';
import { LessonStatusChip } from '@/core/ui/feedback/LessonStatusChip';
import type { ReportAction } from '@/teacher/lib/day';
import { ConfirmedChip, TeacherCancelForm, useTeacherActs } from '@/teacher/lesson-actions';
import { TeacherLessonActions } from './TeacherLessonActions';

export interface TeacherLessonCardProps {
  lesson: LessonView;
  /** The teacher's zone: the lesson's time on her own clock. */
  tz: string;
  report: ReportAction | null;
  /** Says what landed («سأحضر», a cancel): the screen holds it, the card may leave the list. */
  onNotice: (text: string) => void;
  onReport: () => void;
}

/** «16:00 · 45 دقيقة · عند الطالب 15:00» on the teacher's clock, the student's when it differs. */
function timeLine(lesson: LessonView, tz: string, cycle: ClockCycle): string {
  const start = new Date(lesson.starts_at);
  const theirs = [...new Set(lesson.students.map((s) => s.tz))]
    .filter((z) => z && clockTime(start, z) !== clockTime(start, tz))
    .map((z) => t.teacherDash.studentTime.replace('{time}', clockIn(start, z, cycle)));
  return [clockIn(start, tz, cycle), durationLabel(lesson), ...theirs].filter(Boolean).join(' · ');
}

/** Names, the live badge and status, then the time line on her clock. */
function CardHead({ lesson, tz }: { lesson: LessonView; tz: string }) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const names = {
    flex: 1,
    fontFamily: type.ui[700],
    fontSize: type.size.base,
    lineHeight: type.lineHeight(type.size.base),
    color: color.ink,
  };
  const time = {
    fontFamily: type.ui[500],
    fontSize: type.size.xs,
    color: color.ink2,
    fontVariant: ['tabular-nums' as const],
  };
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <AppText style={names}>{studentNames(lesson)}</AppText>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <LiveBadge lesson={lesson} />
          <LessonStatusChip status={lesson.status} size="sm" />
        </View>
      </View>
      <AppText style={time}>{timeLine(lesson, tz, cycle)}</AppText>
    </>
  );
}

/**
 * One of my lessons today (R-TCH-03): students, status, my time, «ادخل الحلقة» while it is open,
 * «سأحضر» and «إلغاء الحلقة» before it starts (docs/46 C7, each its own mutation; the cancel opens
 * its reason form in the card), and the report once it has started. No move here. The buttons:
 * TeacherLessonActions. When the lesson's teacher holds it in our classroom (platform_classroom,
 * per-teacher meeting mode) the way in is the platform classroom, not the lesson's fixed link.
 */
export function TeacherLessonCard(p: TeacherLessonCardProps) {
  const { color } = useTheme();
  const { lesson } = p;
  const auto = usePlatformClassroom(lesson.platform_classroom);
  const acts = useTeacherActs(lesson, p.onNotice);
  // Saffron edge while «سأحضر» waits on her (docs/46 D1), whatever the family confirmation setting.
  const needsConfirm = acts.canConfirm;
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
      <CardHead lesson={lesson} tz={p.tz} />
      <ConfirmedChip on={acts.confirmed} />
      {acts.error ? <ErrorLine message={acts.error} /> : null}
      {acts.cancelling ? (
        <TeacherCancelForm lessonId={lesson.id} onClose={acts.closeCancel} onDone={p.onNotice} />
      ) : (
        <TeacherLessonActions
          lesson={lesson}
          auto={auto}
          report={p.report}
          acts={acts}
          onReport={p.onReport}
        />
      )}
    </View>
  );
}
