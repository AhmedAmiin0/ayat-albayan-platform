import type { CourseCardView } from '@ab/shared';
import { View } from 'react-native';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { useViewerClock } from '@/core/lib/clock';
import { daysText } from '@/sales-course';
import { cardLines } from './card-text';
import { PackageHead } from './PackageHead';

/** Before a course is booked the card says so. */
export function CourseSummary({ card }: { card: CourseCardView }) {
  const { color } = useTheme();
  const viewer = useViewerClock();
  const size = type.size.sm;
  const line = { fontFamily: type.ui[500], fontSize: size, lineHeight: type.lineHeight(size) };
  const course = card.course;
  const head = card.package ? <PackageHead pkg={card.package} /> : null;
  if (!course) {
    const empty = card.subscriptionId ? t.courseCard.noCourse : t.courseCard.noPackage;
    return (
      <View style={{ gap: 8 }}>
        {head}
        <AppText style={{ ...line, color: color.ink2 }}>{empty}</AppText>
      </View>
    );
  }
  const lines = cardLines(course);
  return (
    <View style={{ gap: 4 }}>
      {head}
      <AppText style={{ ...line, color: color.ink }}>
        {daysText(course.days, course.tz, viewer)}
      </AppText>
      <AppText style={{ ...line, color: color.ink2 }}>{lines.teacher}</AppText>
      {lines.unbooked ? (
        <AppText style={{ ...line, color: color.act }}>{lines.unbooked}</AppText>
      ) : null}
    </View>
  );
}
