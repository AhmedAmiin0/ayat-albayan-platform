import type { LessonView } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/button';
import { missedStudents } from '@/features/booking/contract';
import { t } from '@/lib/i18n';

/**
 * «حجز تعويضي» on a missed lesson (R-SCH-10): opens the booking wizard for that student with the
 * lesson preselected. One link per student, named when the lesson was a group's. Admin only: the
 * drawer is the admin's.
 */
export function MakeupAction({ lesson }: { lesson: LessonView }) {
  const students = missedStudents(lesson);
  if (students.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {students.map((s) => (
        <Link
          key={s.id}
          to="/admin/book"
          search={{ kind: 'makeup', studentId: s.id, missedLessonId: lesson.id }}
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          {lesson.students.length > 1 ? `${t.booking.makeup.action} · ${s.name}` : t.booking.makeup.action}
        </Link>
      ))}
    </div>
  );
}
