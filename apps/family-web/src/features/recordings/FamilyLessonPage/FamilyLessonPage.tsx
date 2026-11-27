import { LessonPage } from '@ab/web-kit';
import { StudentOf } from '@/features/recordings/StudentOf';
import type { Props } from './FamilyLessonPage.types';
import { useFamilyLessonPage } from './use-family-lesson-page';

/** docs/50 §6: a sent lesson's recording, report lines and files; back where it came from. */
export function FamilyLessonPage({ lessonId, studentId }: Props) {
  const { nav } = useFamilyLessonPage({ studentId });
  return (
    <StudentOf studentId={studentId}>
      {(student) => (
        <LessonPage
          student={student}
          lessonId={lessonId}
          onOpenReport={nav.openReport}
          onBack={nav.back}
        />
      )}
    </StudentOf>
  );
}
