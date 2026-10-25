import { teacherName } from '@ab/shared';
import type { LessonView } from '@ab/shared';
import { View } from 'react-native';
import { EditTimeIconButton } from '@/edit-time/EditTimeIconButton';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { riyadhTime, studentNames } from './lesson-text';
import { TimelineRow } from './TimelineRow';
import { locale } from '@/lib/locale';

/**
 * A lesson that has ended: one 42pt line on a dashed rule, names, teacher and the status word, and
 * a trailing 44pt pencil («عدّل الوقت») for a held lesson whose start or length needs correcting
 * (R-SCH-11): an icon, because a labelled button would leave the names a few letters.
 */
export function PastLessonRow({ lesson, onEditTime }: { lesson: LessonView; onEditTime?: (lesson: LessonView) => void }) {
  const { color } = useTheme();
  const text = { fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs) };
  return (
    <TimelineRow time={riyadhTime(lesson.starts_at)} status={lesson.status} compact>
      <View
        style={{
          minHeight: 42,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderBottomWidth: 1,
          borderStyle: 'dashed',
          borderColor: color.ruleStrong,
        }}
      >
        <AppText
          numberOfLines={1}
          style={{ ...text, flex: 1, fontFamily: type.ui[500], color: color.ink2 }}
        >
          {`${studentNames(lesson)} ${t.today.withTeacher.replace('{teacher}', teacherName(lesson.teacher, locale))}`}
        </AppText>
        <AppText style={{ ...text, fontFamily: type.ui[500], color: color.ink3 }}>
          {t.enums.lessonStatus[lesson.status]}
        </AppText>
        {onEditTime ? <EditTimeIconButton lesson={lesson} onPress={() => onEditTime(lesson)} /> : null}
      </View>
    </TimelineRow>
  );
}
