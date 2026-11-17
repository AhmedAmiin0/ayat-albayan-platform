import { router } from 'expo-router';
import { Button, t } from '@ab/mobile-kit';
import { lessonFilesHref } from './hrefs';

/** «ملفات الحلقة» under a recording: the lesson's files and «أضف ملفًا للحلقة». */
export function LessonFilesLink({ lessonId, admin }: { lessonId: string; admin: boolean }) {
  return (
    <Button
      variant="secondary"
      label={t.lessonFiles.title}
      onPress={() => router.push(lessonFilesHref({ lessonId, admin }))}
    />
  );
}
