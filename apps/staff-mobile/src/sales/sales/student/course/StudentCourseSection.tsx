import { router } from 'expo-router';
import type { SalesStudentSchedule } from '@ab/shared';
import { t, Button } from '@ab/mobile-kit';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { CourseCardSection } from '@/students';
import { useCourseState } from '@/sales/sales/student/student-api';
import { UpcomingLessons } from '@/sales/sales/student/UpcomingLessons';

interface StudentCourseSectionProps {
  studentId: string;
  subscriptionId: string | null;
  /** Hers, or any with sales.renew_any: hers to book or move (the API's own check). */
  acts: boolean;
  /** «الجدول»: its next lessons with the assistant's lesson sheet (absent in an old cache). */
  schedule: SalesStudentSchedule | undefined;
}

/**
 * The weekly course on «تفاصيل الطالب» (owner 2026-11-06): a paid package with no course yet (a
 * link sale stops at the link) offers «أيام الحلقات», the course wizard; then «الدورة والباقة»
 * (owner 2026-11-17): the course, its next lessons and the actions; «تغيير المعلم» / «تغيير موعد
 * الحلقات» / «مدّ الجدول» only once a course exists. «إلغاء الاشتراك» as before.
 */
export function StudentCourseSection(props: StudentCourseSectionProps) {
  const { studentId, subscriptionId, acts } = props;
  const base = useTreeBase();
  const course = useCourseState(studentId, acts);
  const upcoming = props.schedule?.upcoming ?? [];
  const wizard = inTree(base, { pathname: '/inbox/sales-course', params: { studentId } });
  return (
    <>
      {acts && course.book ? (
        <Button
          variant="secondary"
          label={t.booking.courseDays}
          onPress={() => router.push(wizard)}
        />
      ) : null}
      <CourseCardSection
        studentId={studentId}
        tree="sales"
        subscriptionId={subscriptionId}
        moves={acts && course.moves}
        movesOf={course.movesOf}
        upcoming={<UpcomingLessons lessons={upcoming} studentId={studentId} />}
      />
    </>
  );
}
