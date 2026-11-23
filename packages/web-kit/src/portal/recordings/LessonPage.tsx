import type { PortalLessonAssets, PortalStudent } from '@ab/shared';
import { Icon, QueryState, Button, Card } from '#/components/ui/index.ts';
import { t } from '#/lib/i18n/index.ts';
import type { OpenReport } from '#/portal/report/ReportView.tsx';
import { usePortalLesson } from './use-recordings';
import { LessonHead, ReportBlock } from './LessonHead';
import { PortalFileList } from './PortalFileList';
import { LessonParts } from './LessonParts';

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

/**
 * A lesson's own page (`/lesson/<id>`, the app's lesson screen; boards FamFilesWebNoRec,
 * FamFilesWebAttended): reached from a «حضرها» row's «ملفات الحلقة» even when nothing was
 * recorded. Its recording (if any), the report's first lines and «ملفات الحلقة». While loading
 * or after an error the page is «صفحة الحلقة».
 */
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
