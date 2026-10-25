import type { BookedCourse } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { type, useTheme } from '@/theme';
import { daysText } from '../lib/course-days';

export interface CurrentCourseProps {
  course: BookedCourse;
  /** «تغيير أيام الحلقات»: opens the change flow. */
  onChange: () => void;
  /** Beside another primary (the renewal's «تابِع» or the wizard): the change is the secondary. */
  secondary?: boolean | undefined;
  /** Its days are already named just below (it is the renewal's previous course): not twice. */
  hideDays?: boolean | undefined;
}

/**
 * A student with a course (view.current): whether it runs now or is booked to start later (the
 * server's `running`), so the block says which package it is about; its days, and the way to change them.
 */
export function CurrentCourse({ course, onChange, secondary, hideDays }: CurrentCourseProps) {
  const { color } = useTheme();
  const text = { fontFamily: type.ui[500], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink };
  const texts = t.booking.courseChange;
  return (
    <View style={{ gap: 12 }}>
      <AppText style={text}>{course.running ? texts.running : texts.upcoming}</AppText>
      {hideDays ? null : <AppText style={text}>{texts.currentDays.replace('{days}', daysText(course.days, course.tz))}</AppText>}
      <Button variant={secondary ? 'secondary' : 'primary'} label={texts.changeDays} onPress={onChange} />
    </View>
  );
}
