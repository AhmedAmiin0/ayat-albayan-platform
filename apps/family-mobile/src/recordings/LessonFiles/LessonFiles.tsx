import { ErrorLine, InsetGroup, ListRow, Section, t } from '@ab/mobile-kit';
import { LessonFileRow } from '@/recordings/LessonFileRow';
import type { LessonFilesProps } from './LessonFiles.types';
import { useLessonFiles } from './use-lesson-files';

/** The report's PDF first, then the files staff shared. */
export function LessonFiles({ studentId, reportId, files }: LessonFilesProps) {
  const { pdf, open, title } = useLessonFiles({ studentId, files });
  return (
    <Section title={title}>
      <InsetGroup>
        <ListRow
          title={t.lessonFiles.reportPdf}
          subtitle={t.lessonFiles.media.pdf}
          onPress={() => pdf.mutate({ studentId, kind: 'reports', id: reportId })}
        />
        {files.map((file) => (
          <LessonFileRow key={file.id} file={file} studentId={studentId} onOpen={open.mutate} />
        ))}
      </InsetGroup>
      {pdf.isError || open.isError ? <ErrorLine message={t.lessonFiles.fileFailed} /> : null}
    </Section>
  );
}
