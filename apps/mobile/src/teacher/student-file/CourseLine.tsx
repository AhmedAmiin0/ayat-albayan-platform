import type { TeacherCourseView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { courseLines } from './course-text';

interface CourseLineProps {
  course: TeacherCourseView | null;
  /** Her zone: the end's day is read on her calendar. */
  tz: string;
}

/**
 * The course she teaches (docs/47): start, end and «الحلقات x من y» wrapping at 390pt, then the
 * ink-3 hint that the count includes every teacher's lessons. No course: one note.
 */
export function CourseLine({ course, tz }: CourseLineProps) {
  const { color } = useTheme();
  if (!course) return <Note>{t.teacherFile.noCourse}</Note>;
  const text = {
    fontFamily: type.ui[500],
    fontSize: type.size.sm,
    lineHeight: type.lineHeight(type.size.sm),
    color: color.ink,
  };
  return (
    <View accessibilityRole="summary" style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2 }}>
        {courseLines(course, tz).map((line) => (
          <AppText key={line} style={text}>
            {line}
          </AppText>
        ))}
      </View>
      <Note>{t.teacherFile.courseHint}</Note>
    </View>
  );
}
