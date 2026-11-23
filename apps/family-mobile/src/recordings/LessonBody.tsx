import type { PortalLessonAssets } from '@ab/shared';
import { Section, t } from '@ab/mobile-kit';
import { useReportPage } from '#/portal/index.ts';
import { ReportBody } from '#/report/index.ts';
import { LoadState } from '#/ui/index.ts';
import { LessonFiles } from './LessonFiles';
import { LessonRecording } from './LessonRecording';

/** «الجزء 1» … when a lesson was recorded in parts. */
const partTitle = (i: number, total: number): string =>
  total > 1 ? t.lessonFiles.part.replace('{n}', String(i + 1)) : t.lessonFiles.recording;

/** The lesson page's body: the recording(s), the report, then its files. */
export function LessonBody({ view, studentId }: { view: PortalLessonAssets; studentId: string }) {
  const reportId = view.report_id ?? '';
  const report = useReportPage(reportId);
  // Oldest part first, so the parts play in order.
  const parts = [...view.recordings].reverse();
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
