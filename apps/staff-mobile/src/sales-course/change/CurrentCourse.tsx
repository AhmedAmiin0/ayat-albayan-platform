import type { BookedCourse } from '@ab/shared';
import { View } from 'react-native';
import { t, AppText, Button, type, useTheme } from '@ab/mobile-kit';
import { daysText } from '@/sales-course/lib/course-days';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

interface CurrentCourseProps {
  course: BookedCourse;
  onChange: () => void;
  /** Secondary when another primary action sits beside it. */
  secondary?: boolean | undefined;
  /** Its days are already named just below (it is the renewal's previous course): not twice. */
  hideDays?: boolean | undefined;
}

/**
 * A student with a course (view.current): whether it runs now or is booked to start later (the
 * server's `running`), so the block names its package; its days, and the way to change them.
 */
export function CurrentCourse({ course, onChange, secondary, hideDays }: CurrentCourseProps) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const viewer = { tz, cycle };
  const { color } = useTheme();
  const text = {
    fontFamily: type.ui[500],
    fontSize: type.size.body,
    lineHeight: type.lineHeight(type.size.body),
    color: color.ink,
  };
  const texts = t.booking.courseChange;
  return (
    <View style={{ gap: 12 }}>
      <AppText style={text}>{course.running ? texts.running : texts.upcoming}</AppText>
      {hideDays ? null : <AppText style={text}>{texts.currentDays.replace('{days}', daysText(course.days, course.tz, viewer))}</AppText>}
      <Button variant={secondary ? 'secondary' : 'primary'} label={texts.changeDays} onPress={onChange} />
    </View>
  );
}
