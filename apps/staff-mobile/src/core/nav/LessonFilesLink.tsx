import { router, type Href } from 'expo-router';
import { Button, t } from '@ab/mobile-kit';

const enc = encodeURIComponent;

/** «ملفات الحلقة» in the admin's students tab, or under the teacher's reports. */
const lessonFilesHref = (input: { lessonId: string; admin: boolean }): Href =>
  input.admin
    ? `/students/lesson-files/${enc(input.lessonId)}`
    : `/teacher/reports/student/lesson-files/${enc(input.lessonId)}`;

/**
 * «ملفات الحلقة» under a recording or in a report form: the lesson's files and «أضف ملفًا للحلقة».
 * In core/nav (a leaf) so the student file and the teacher's report don't import all of teaching.
 */
export function LessonFilesLink({ lessonId, admin }: { lessonId: string; admin: boolean }) {
  return (
    <Button
      variant="secondary"
      label={t.lessonFiles.title}
      onPress={() => router.push(lessonFilesHref({ lessonId, admin }))}
    />
  );
}
