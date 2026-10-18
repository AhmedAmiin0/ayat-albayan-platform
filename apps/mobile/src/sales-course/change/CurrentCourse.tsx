import type { BookedCourse } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { type, useTheme } from '@/theme';
import { daysText } from '../course-days';

export interface CurrentCourseProps {
  course: BookedCourse;
  /** «تغيير أيام الحلقات»: opens the change flow. */
  onChange: () => void;
}

/** A student whose course still runs (course_exists): its days, and the way to change them. */
export function CurrentCourse({ course, onChange }: CurrentCourseProps) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <AppText
        style={{ fontFamily: type.ui[500], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink }}
      >
        {t.booking.courseChange.currentDays.replace('{days}', daysText(course.days))}
      </AppText>
      <Button label={t.booking.courseChange.changeDays} onPress={onChange} />
    </View>
  );
}
