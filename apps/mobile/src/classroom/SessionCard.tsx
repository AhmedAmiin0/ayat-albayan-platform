import { lessonStatusStyle, teacherName, type LessonView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { shape, type, useTheme } from '@/theme';
import { riyadhTime, studentNames } from '@/today/lesson-text';
import { AppText } from '@/ui/AppText';
import { StatusChip } from '@/ui/StatusChip';
import { SessionActions } from './SessionActions';
import type { SessionGroup } from './sessions';

/** The card's chip: «بدأت» / «انتهت» by the room, otherwise the lesson's own status. */
function Chip({ lesson, group }: { lesson: LessonView; group: SessionGroup }) {
  if (group === 'now') return <StatusChip tone="ok" glyph="fill" label={t.classroom.admin.live} size="sm" />;
  if (group === 'ended') return <StatusChip tone="neutral" glyph="struck" label={t.classroom.admin.ended} size="sm" />;
  return <StatusChip {...lessonStatusStyle[lesson.status]} label={t.enums.lessonStatus[lesson.status]} size="sm" />;
}

/** One session of the admin board: time range, status, students, teacher, then its actions. */
export function SessionCard({ lesson, group }: { lesson: LessonView; group: SessionGroup }) {
  const { color } = useTheme();
  const time = t.classroom.admin.time
    .replace('{from}', riyadhTime(lesson.starts_at))
    .replace('{to}', riyadhTime(lesson.ends_at));
  const small = { fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink2 };
  return (
    <View
      style={{
        gap: 6,
        padding: 12,
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
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.body, color: color.ink }}>{studentNames(lesson)}</AppText>
      <AppText style={small}>{`${t.classroom.admin.teacher} ${teacherName(lesson.teacher, locale)}`}</AppText>
      <SessionActions lesson={lesson} group={group} />
    </View>
  );
}
