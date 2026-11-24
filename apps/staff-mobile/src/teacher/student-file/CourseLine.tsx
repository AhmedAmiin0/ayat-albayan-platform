import type { TeacherCourseView } from '@ab/shared';
import { View } from 'react-native';
import { t, AppText, type, useTheme } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { courseLines } from './course-text';

interface CourseLineProps {
  course: TeacherCourseView | null;
  /** Her zone: the end's day is read on her calendar. */
  tz: string;
}

/** The count includes every teacher's lessons (docs/47). */
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
