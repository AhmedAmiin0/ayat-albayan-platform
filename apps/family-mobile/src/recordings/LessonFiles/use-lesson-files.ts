import { t } from '@ab/mobile-kit';
import { useOpenFile } from '@/report';
import { useOpenLessonFile } from '@/recordings/use-assets';
import type { LessonFilesProps } from './LessonFiles.types';

export function useLessonFiles({
  studentId,
  files,
}: Pick<LessonFilesProps, 'studentId' | 'files'>) {
  const pdf = useOpenFile();
  const open = useOpenLessonFile(studentId);
  // The report's PDF is one of the files.
  const title = t.lessonFiles.header.replace('{n}', String(files.length + 1));
  return { pdf, open, title };
}
