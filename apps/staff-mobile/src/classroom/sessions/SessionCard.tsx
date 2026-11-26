import { teacherName, type LessonView } from '@ab/schedule';
import type { SessionGroup } from '@ab/client-core';
import { View } from 'react-native';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t, locale, shape, type, useTheme, AppText, StatusChip, Avatar } from '@ab/mobile-kit';
import { lessonClock, studentNames, viewerDayHint } from '@/today';
import { SessionActions } from './SessionActions';
import { LessonStatusChip } from '@/core/ui/feedback/LessonStatusChip';

/** Started or ended by the room, otherwise the lesson's own status. */
function Chip({ lesson, group }: { lesson: LessonView; group: SessionGroup }) {
  if (group === 'now') return <StatusChip tone="ok" glyph="fill" label={t.classroom.admin.live} size="sm" />;
  if (group === 'ended') return <StatusChip tone="neutral" glyph="struck" label={t.classroom.admin.ended} size="sm" />;
  return <LessonStatusChip status={lesson.status} size="sm" />;
}

/** One session of the admin board: time range, status, students, teacher, then its actions. */
export function SessionCard({ lesson, group }: { lesson: LessonView; group: SessionGroup }) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const teacher = teacherName(lesson.teacher, locale);
  const range = t.classroom.admin.time
    .replace('{from}', lessonClock(lesson.starts_at, tz, cycle))
    .replace('{to}', lessonClock(lesson.ends_at, tz, cycle));
  // The board pages by Riyadh days (GET /lessons/day): another day for the viewer is named.
  const time = [viewerDayHint(lesson.starts_at, tz), range].filter(Boolean).join(' ');
  const small = { fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink2 };
  return (
    <View
      style={{
        padding: 12,
        gap: 6,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.raised,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink, fontVariant: ['tabular-nums'] }}>
          {time}
        </AppText>
        <Chip lesson={lesson} group={group} />
      </View>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.body, color: color.ink }}>
        {studentNames(lesson)}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Avatar name={teacher} id={lesson.teacher.id} src={lesson.teacher.avatar_url} size="sm" decorative />
        <AppText style={small}>{`${t.classroom.admin.teacher} ${teacher}`}</AppText>
      </View>
      <SessionActions lesson={lesson} group={group} />
    </View>
  );
}
