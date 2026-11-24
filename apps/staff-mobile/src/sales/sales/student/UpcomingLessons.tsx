import type { SalesStudentLesson } from '@ab/shared';
import { wallParts } from '@ab/schedule';
import { useViewerTz } from '@/core/lib/clock';
import { Fragment, useState } from 'react';
import { View } from 'react-native';
import { dayLabel, useLessonDetails } from '@/calendar';
import { t, Button } from '@ab/mobile-kit';
import { Note } from '@/more';
import { SalesLessonRow } from '@/sales/sales/components/SalesLessonRow';
import { SalesLessonSheet } from '@/sales/sales/components/SalesLessonSheet';
import { SmallHeading } from '@/sales/sales/components/SmallHeading';
import { fill } from '@/sales/sales/lib/sales-text';

/** No long pages: the next few, the rest behind show all. */
const UPCOMING_SHOWN = 5;

/** No link, and this student's name stays plain in the lesson details. */
export function UpcomingLessons({ lessons, studentId }: { lessons: readonly SalesStudentLesson[]; studentId: string }) {
  const [all, setAll] = useState(false);
  const details = useLessonDetails(lessons);
  const s = t.sales.student.schedule;
  const shown = all ? lessons : lessons.slice(0, UPCOMING_SHOWN);
  const tz = useViewerTz();
  const dayOf = (l: SalesStudentLesson) => wallParts(l.starts_at, tz).date;
  return (
    <View style={{ gap: 4 }}>
      <SmallHeading header>{s.upcoming}</SmallHeading>
      {lessons.length === 0 ? <Note>{s.noUpcoming}</Note> : null}
      {shown.map((lesson, i) => {
        const day = dayOf(lesson);
        const prev = shown[i - 1];
        return (
          <Fragment key={lesson.id}>
            {!prev || dayOf(prev) !== day ? <Note>{dayLabel(day)}</Note> : null}
            <SalesLessonRow lesson={lesson} onOpen={details.open} dated />
          </Fragment>
        );
      })}
      {lessons.length > UPCOMING_SHOWN ? (
        <Button variant="secondary" label={all ? s.showLess : fill(s.showAll, { n: String(lessons.length) })} onPress={() => setAll(!all)} />
      ) : null}
      <SalesLessonSheet lesson={details.lesson} onClose={details.close} studentId={studentId} />
    </View>
  );
}
