import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { Button } from '@/core/ui/primitives/Button';
import { CourseActionsSection } from '@/students';
import { useCourseState } from '@/sales/sales/student/student-api';

interface StudentCourseSectionProps {
  studentId: string;
  subscriptionId: string | null;
  /** Hers, or any with sales.renew_any: hers to book or move (the API's own check). */
  acts: boolean;
}

/**
 * The weekly course on «تفاصيل الطالب» (owner 2026-11-06): a paid package with no course yet (a
 * link sale stops at the link) offers «أيام الحلقات», the course wizard; «تغيير المعلم» /
 * «تغيير موعد الحلقات» only once a course exists. «إلغاء الاشتراك» as before.
 */
export function StudentCourseSection(props: StudentCourseSectionProps) {
  const { studentId, subscriptionId, acts } = props;
  const base = useTreeBase();
  const course = useCourseState(studentId, acts);
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
      <CourseActionsSection
        studentId={studentId}
        subscriptionId={subscriptionId}
        moves={acts && course.moves}
        movesOf={course.movesOf}
      />
    </>
  );
}
