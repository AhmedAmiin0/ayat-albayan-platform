import type { CourseCardView } from '@ab/shared';
import { View } from 'react-native';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { useViewerClock } from '@/core/lib/clock';
import { daysText } from '@/sales-course';
import { cardLines } from './card-text';

/**
 * The card's course lines (owner 2026-11-17): the days and times, «المعلم/ة · آخر حلقة في …»,
 * «بقيت حلقتان بلا مواعيد» in the act ink (it asks for «مدّ الجدول»); before a course is booked
 * the card says so.
 */
export function CourseSummary({ card }: { card: CourseCardView }) {
  const { color } = useTheme();
  const viewer = useViewerClock();
  const size = type.size.sm;
  const line = { fontFamily: type.ui[500], fontSize: size, lineHeight: type.lineHeight(size) };
  const course = card.course;
  if (!course) {
    const empty = card.subscriptionId ? t.courseCard.noCourse : t.courseCard.noPackage;
    return <AppText style={{ ...line, color: color.ink2 }}>{empty}</AppText>;
  }
  const lines = cardLines(course);
  return (
    <View style={{ gap: 4 }}>
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
