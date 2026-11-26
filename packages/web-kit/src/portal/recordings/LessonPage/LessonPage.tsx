import type { PortalLessonAssets, PortalStudent } from '@ab/shared';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { Card } from '@ab/web-kit/components/ui/surface/card';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import type { OpenReport } from '@ab/web-kit/portal/report/ReportView';
import { usePortalLesson } from '@ab/web-kit/portal/recordings/use-recordings';
import { LessonHead, ReportBlock } from '@ab/web-kit/portal/recordings/LessonHead';
import { PortalFileList } from '@ab/web-kit/portal/recordings/PortalFileList';
import { LessonParts } from '@ab/web-kit/portal/recordings/LessonParts';

interface Props {
  student: PortalStudent;
  lessonId: string;
  onOpenReport: (report: OpenReport) => void;
  onBack: () => void;
}

const CARD = 'grid content-start gap-4 p-5';

function Body({ view, student, onOpenReport }: Omit<Props, 'lessonId' | 'onBack'> & {
  view: PortalLessonAssets;
}) {
  const reportId = view.report_id;
  return (
    <>
      <LessonHead view={view} student={student} level={1} />
      <div className="grid grid-cols-1 items-start gap-4 @3xl:grid-cols-2">
        <div className="grid grid-cols-1 gap-4">
          {view.recordings.length > 0 && (
            <Card className={CARD}>
              <LessonParts student={student} recordings={view.recordings} />
            </Card>
          )}
          {reportId && (
            <Card className={CARD}>
              <ReportBlock reportId={reportId} onOpenReport={onOpenReport} />
            </Card>
          )}
        </div>
        <Card className={CARD}>
          <PortalFileList studentId={student.id} reportId={reportId} files={view.files} />
        </Card>
      </div>
    </>
  );
}

/** Reached from an attended row even when nothing was recorded. */
export function LessonPage({ student, lessonId, onOpenReport, onBack }: Props) {
  const query = usePortalLesson({ studentId: student.id, lessonId });
  return (
    <section
      aria-label={t.lessonFiles.lessonPage}
      className="@container grid grid-cols-1 animate-fade-up gap-4"
    >
      <Button type="button" variant="secondary" size="sm" className="justify-self-start" onClick={onBack}>
        <Icon name="chevron-right" />
        {t.common.back}
      </Button>
      {!query.data && <h1 className="font-display text-h2 font-bold">{t.lessonFiles.lessonPage}</h1>}
      <QueryState query={query} rows={3}>
        {(view) => <Body view={view} student={student} onOpenReport={onOpenReport} />}
      </QueryState>
    </section>
  );
}
