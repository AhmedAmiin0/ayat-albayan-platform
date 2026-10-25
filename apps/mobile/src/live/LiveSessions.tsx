import { teacherName } from '@ab/shared';
import type { LessonView } from '@ab/shared';
import { View } from 'react-native';
import { JoinClassroomButton } from '@/classroom/JoinClassroomButton';
import { useMinuteClock } from '@/classroom/use-minute-clock';
import { t } from '@/lib/i18n';
import { useJoinWindow } from '@/lib/public-config';
import { shape, type, useTheme } from '@/theme';
import { riyadhTime, studentNames } from '@/today/lesson-text';
import { AppText } from '@/core/ui/primitives/AppText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { liveLessons, type LiveLesson } from './live-filter';
import { locale } from '@/lib/locale';

function LiveRow({ item, showTeacher }: { item: LiveLesson; showTeacher: boolean }) {
  const { color } = useTheme();
  const { lesson, phase } = item;
  const small = { fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink2 };
  return (
    <View style={{ gap: 4, paddingVertical: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink, fontVariant: ['tabular-nums'] }}>
          {riyadhTime(lesson.starts_at)}
        </AppText>
        {phase === 'live' ? (
          <StatusChip tone="ok" glyph="fill" label={t.live.now} size="sm" />
        ) : (
          <AppText style={{ ...small, fontVariant: ['tabular-nums'] }}>
            {t.live.startsAt.replace('{time}', riyadhTime(lesson.starts_at))}
          </AppText>
        )}
      </View>
      <AppText numberOfLines={2} style={{ fontFamily: type.ui[600], fontSize: type.size.body, color: color.ink }}>
        {studentNames(lesson)}
      </AppText>
      {showTeacher ? (
        <AppText style={small}>{t.live.teacher.replace('{name}', teacherName(lesson.teacher, locale))}</AppText>
      ) : null}
      <JoinClassroomButton lesson={lesson} />
    </View>
  );
}

/**
 * «جلسات مباشرة» at the top of Today: the lessons the screen already has that are under way or
 * about to start (inside the join window), each one tap from the web classroom. Re-checked every
 * minute; renders nothing when none is live (no empty box).
 */
export function LiveSessions({ lessons, showTeacher = false }: { lessons: readonly LessonView[]; showTeacher?: boolean }) {
  const { color } = useTheme();
  const now = useMinuteClock();
  const items = liveLessons(lessons, now, useJoinWindow());
  if (items.length === 0) return null;
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.raised,
      }}
    >
      <AppText accessibilityRole="header" style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink, paddingTop: 8 }}>
        {t.live.title}
      </AppText>
      {items.map((item) => (
        <LiveRow key={item.lesson.id} item={item} showTeacher={showTeacher} />
      ))}
    </View>
  );
}
