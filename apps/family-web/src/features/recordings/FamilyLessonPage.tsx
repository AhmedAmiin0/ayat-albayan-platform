import { LessonPage } from '@ab/web-kit';
import { StudentOf } from './StudentOf';
import { useLessonNav } from './use-lesson-nav';

interface Props {
  lessonId: string;
  studentId: string;
}

/** docs/50 §6: a sent lesson's recording, report lines and files; back where it came from. */
export function FamilyLessonPage({ lessonId, studentId }: Props) {
  const nav = useLessonNav(studentId);
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
