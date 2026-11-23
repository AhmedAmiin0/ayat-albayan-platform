import { LessonPage } from '@ab/web-kit/portal';
import { StudentOf } from './StudentOf';
import { useLessonNav } from './use-lesson-nav';

interface Props {
  lessonId: string;
  studentId: string;
}

/**
 * `/lesson/<id>?studentId=…` (the app's lesson screen, docs/50 §6): a sent lesson's recording,
 * report lines and files, opened from a «حضرها» row or a recording; back where it came from.
 */
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
