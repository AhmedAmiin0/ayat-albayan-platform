import type { PortalLessonAssets, PortalStudent } from '@ab/shared';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FAM_CARD } from '@ab/web-kit/family/panels/panel-look';
import { useClock } from '@ab/web-kit/lib/clock';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { LoadState } from '@ab/web-kit/portal/LoadState';
import type { OpenReport } from '@ab/web-kit/portal/report/ReportView';
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
        <h2 className="text-body font-bold family:text-[21px] family:font-extrabold">
          {lessonTitle(view.lesson_starts_at, clock)}
        </h2>
        <p className="text-sm text-ink-3">{lessonLine(view, { name: student.name, clock })}</p>
      </div>
      <LessonParts studentId={student.id} recordings={view.recordings} />
      {reportId && <ReportSummary reportId={reportId} />}
      {reportId && (
        <Button
          type="button"
          variant="secondary"
          className="justify-self-start family:min-h-12 family:justify-self-stretch family:text-[15px]
            family:font-extrabold family:text-lapis family:sm:min-h-12"
          onClick={() => onOpenReport({ reportId, recordingId: null })}
        >
          <Icon name="template" className="hidden family:block" />
          {t.lessonFiles.openReport}
        </Button>
      )}
      <PortalFileList studentId={student.id} reportId={reportId} files={view.files} />
    </div>
  );
}

/**
 * The family's lesson page (canvas RecXWebFamilyLesson): the recording, the report, the files. The
 * family look (board PortalWebRecordings): a lifted card with a green top edge.
 */
export function LessonPanel({ student, lessonId, onOpenReport }: Props) {
  const query = usePortalLesson({ studentId: student.id, lessonId });
  return (
    <section
      aria-label={t.lessonFiles.lessonPage}
      className={cn('rounded-lg border border-rule bg-raised p-4', FAM_CARD.green)}
    >
      <LoadState query={query} rows={2}>
        {(view) => <Body view={view} student={student} onOpenReport={onOpenReport} />}
      </LoadState>
    </section>
  );
}
