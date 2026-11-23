import type { PortalLessonFile } from '@ab/shared';
import { ErrorLine, InsetGroup, ListRow, Section, t } from '@ab/mobile-kit';
import { useOpenFile } from '#/report/index.ts';
import { LessonFileRow } from './LessonFileRow';
import { useOpenLessonFile } from './use-assets';

interface LessonFilesProps {
  studentId: string;
  reportId: string;
  files: readonly PortalLessonFile[];
}

/** «ملفات الحلقة»: the report's PDF first, then the files staff shared (canvas RecXLessonFiles). */
export function LessonFiles({ studentId, reportId, files }: LessonFilesProps) {
  const pdf = useOpenFile();
  const open = useOpenLessonFile(studentId);
  // The report's PDF is one of the files.
  const title = t.lessonFiles.header.replace('{n}', String(files.length + 1));
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
