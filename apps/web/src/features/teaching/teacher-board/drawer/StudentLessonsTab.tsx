import type { LessonView } from '@ab/shared';
import { EmptyState } from '@/components/ui/display/empty-state';
import { TeacherLessonCard } from '@/features/teaching/teacher';
import { t } from '@/lib/i18n/i18n';

export interface StudentLessonsTabProps {
  /** The student's lessons in the board window, oldest first. */
  lessons: readonly LessonView[];
  tz: string;
  fallbackLink: string | null;
  onDone: (message: string) => void;
}

/**
 * «الحلقات»: the student's lessons in the window as the teacher's own cards: «سأحضر» / «إلغاء
 * الحلقة» before the start, the report link (/teacher/report/$lessonId) once it started.
 */
export function StudentLessonsTab({ lessons, tz, fallbackLink, onDone }: StudentLessonsTabProps) {
  if (lessons.length === 0) return <EmptyState title={t.teacherBoard.noLessons} />;
  return (
    <div>
      <p className="text-xs text-ink-3">{t.teacherBoard.window}</p>
      {lessons.map((lesson) => (
        <TeacherLessonCard
          key={lesson.id}
          lesson={lesson}
          tz={tz}
          fallbackLink={fallbackLink}
          onDone={onDone}
        />
      ))}
    </div>
  );
}
