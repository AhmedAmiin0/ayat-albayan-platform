import { router, type Href } from 'expo-router';
import { Button, t } from '@ab/mobile-kit';

const enc = encodeURIComponent;

const lessonFilesHref = (input: { lessonId: string; admin: boolean }): Href =>
  input.admin
    ? `/students/lesson-files/${enc(input.lessonId)}`
    : `/teacher/reports/student/lesson-files/${enc(input.lessonId)}`;

/** In core/nav (a leaf) so the student file and teacher report don't import all of teaching. */
export function LessonFilesLink({ lessonId, admin }: { lessonId: string; admin: boolean }) {
  return (
    <Button
      variant="secondary"
      label={t.lessonFiles.title}
      onPress={() => router.push(lessonFilesHref({ lessonId, admin }))}
    />
  );
}
