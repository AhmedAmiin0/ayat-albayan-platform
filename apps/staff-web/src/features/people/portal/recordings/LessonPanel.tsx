import type { PortalLessonAssets, PortalStudent } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { LoadState } from '@/features/people/portal/LoadState';
import type { OpenReport } from '@/features/people/portal/report/ReportView';
import { LessonParts } from './LessonParts';
import { lessonLine, lessonTitle } from './lesson-words';
import { PortalFileList } from './PortalFileList';
import { ReportSummary } from './ReportSummary';
import { usePortalLesson } from './use-recordings';

interface Props {
  student: PortalStudent;
  lessonId: string;
  onOpenReport: (report: OpenReport) => void;
}

function Body({ view, student, onOpenReport }: Omit<Props, 'lessonId'> & { view: PortalLessonAssets }) {
  const clock = { ...useClock(), tz: student.tz };
  const reportId = view.report_id;
  return (
    <div className="grid gap-4">
      <div className="grid gap-0.5">
        <h2 className="text-body font-bold">{lessonTitle(view.lesson_starts_at, clock)}</h2>
        <p className="text-sm text-ink-3">{lessonLine(view, { name: student.name, clock })}</p>
      </div>
      <LessonParts studentId={student.id} recordings={view.recordings} />
      {reportId && <ReportSummary reportId={reportId} />}
      {reportId && (
        <Button
          type="button"
          variant="secondary"
          className="justify-self-start"
          onClick={() => onOpenReport({ reportId, recordingId: null })}
        >
          {t.lessonFiles.openReport}
        </Button>
      )}
      <PortalFileList studentId={student.id} reportId={reportId} files={view.files} />
    </div>
  );
}

/** The family's lesson page (canvas RecXWebFamilyLesson): the recording, the report, the files. */
export function LessonPanel({ student, lessonId, onOpenReport }: Props) {
  const query = usePortalLesson({ studentId: student.id, lessonId });
  return (
    <section aria-label={t.lessonFiles.lessonPage} className="rounded-lg border border-rule bg-raised p-4">
      <LoadState query={query} rows={2}>
        {(view) => <Body view={view} student={student} onOpenReport={onOpenReport} />}
      </LoadState>
    </section>
  );
}
