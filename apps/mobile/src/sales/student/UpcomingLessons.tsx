import { RIYADH_TZ, wallParts, type SalesStudentLesson } from '@ab/shared';
import { Fragment, useState } from 'react';
import { View } from 'react-native';
import { dayLabel, useLessonDetails } from '@/calendar';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { Button } from '@/core/ui/primitives/Button';
import { SalesLessonRow } from '../components/SalesLessonRow';
import { SalesLessonSheet } from '../components/SalesLessonSheet';
import { SmallHeading } from '../components/SmallHeading';
import { fill } from '../lib/sales-text';

/** The owner's «no long pages»: the next few, the rest behind «عرض الكل». */
const UPCOMING_SHOWN = 5;

/**
 * «الحلقات القادمة»: the sales schedule's rows under their Riyadh day; a tap opens the same «تفاصيل الحلقة»
 * (with «تغيير الموعد» / «إلغاء الحلقة» when that sheet allows them for her students; no link, and this
 * student's name stays plain there).
 */
export function UpcomingLessons({ lessons, studentId }: { lessons: readonly SalesStudentLesson[]; studentId: string }) {
  const [all, setAll] = useState(false);
  const details = useLessonDetails(lessons);
  const s = t.sales.student.schedule;
  const shown = all ? lessons : lessons.slice(0, UPCOMING_SHOWN);
  const dayOf = (l: SalesStudentLesson) => wallParts(l.starts_at, RIYADH_TZ).date;
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
