import { Section, t } from '@ab/mobile-kit';
import { ReportBody } from '@/report';
import { LoadState } from '@/ui';
import { LessonFiles } from '@/recordings/LessonFiles';
import { LessonRecording } from '@/recordings/LessonRecording';
import type { LessonBodyProps } from './LessonBody.types';
import { partTitle } from './lesson-body.helpers';
import { useLessonBody } from './use-lesson-body';

/** The lesson page's body: the recording(s), the report, then its files. */
export function LessonBody({ view, studentId }: LessonBodyProps) {
  const { reportId, report, parts } = useLessonBody({ view });
  return (
    <>
      {parts.map((rec, i) => (
        <LessonRecording
          key={rec.id}
          studentId={studentId}
          recordingId={rec.id}
          title={partTitle(i, parts.length)}
        />
      ))}
      <Section title={t.lessonFiles.report}>
        <LoadState query={report}>{(data) => <ReportBody view={data} />}</LoadState>
      </Section>
      <LessonFiles studentId={studentId} reportId={reportId} files={view.files} />
    </>
  );
}
