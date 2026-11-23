import { createFileRoute } from '@tanstack/react-router';
import { FamilyLessonPage, parseLessonSearch } from '#/features/recordings/index.ts';

/** A sent lesson of one of the login's students: recording, report lines, files (docs/50 §6). */
export const Route = createFileRoute('/_family/lesson/$lessonId')({
  validateSearch: parseLessonSearch,
  component: Lesson,
});

function Lesson() {
  const { lessonId } = Route.useParams();
  const { studentId } = Route.useSearch();
  return <FamilyLessonPage lessonId={lessonId} studentId={studentId} />;
}
