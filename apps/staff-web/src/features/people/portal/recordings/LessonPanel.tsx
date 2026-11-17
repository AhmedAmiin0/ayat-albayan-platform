import type { PortalLessonAssets, PortalStudent } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { LessonWhen } from '@/features/people/portal/lessons/LessonWhen';
import { LoadState } from '@/features/people/portal/LoadState';
import type { OpenReport } from '@/features/people/portal/report/ReportView';
import { PortalFileList } from './PortalFileList';
import { RecordingPlayer } from './RecordingPlayer';
import { usePortalLesson } from './use-recordings';

interface Props {
  student: PortalStudent;
  lessonId: string;
  onOpenReport: (report: OpenReport) => void;
}

function Body({ view, student, onOpenReport }: Omit<Props, 'lessonId'> & { view: PortalLessonAssets }) {
  // Oldest part first, so the parts play in order.
  const parts = [...view.recordings].reverse();
  const reportId = view.report_id;
  return (
    <div className="grid gap-4">
      <h2 className="text-body font-bold">
        <LessonWhen startsAt={view.lesson_starts_at} tz={student.tz} />
      </h2>
      {parts.map((rec) => <RecordingPlayer key={rec.id} studentId={student.id} id={rec.id} />)}
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
      <PortalFileList studentId={student.id} files={view.files} />
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
