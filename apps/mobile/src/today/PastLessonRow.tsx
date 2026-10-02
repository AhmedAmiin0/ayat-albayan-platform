import type { LessonView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { riyadhTime, studentNames } from './lesson-text';
import { TimelineRow } from './TimelineRow';

/** A lesson that has ended: one 42pt line on a dashed rule, names, teacher and the status word. */
export function PastLessonRow({ lesson }: { lesson: LessonView }) {
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
          {`${studentNames(lesson)} ${t.today.withTeacher.replace('{teacher}', lesson.teacher.display_name_ar)}`}
        </AppText>
        <AppText style={{ ...text, fontFamily: type.ui[500], color: color.ink3 }}>
          {t.enums.lessonStatus[lesson.status]}
        </AppText>
      </View>
    </TimelineRow>
  );
}
