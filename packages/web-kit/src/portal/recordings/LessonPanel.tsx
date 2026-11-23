import type { PortalLessonAssets, PortalStudent } from '@ab/shared';
import { Card } from '#/components/ui/surface/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { QueryState } from '#/components/ui/display/index.ts';
import type { OpenReport } from '#/portal/report/ReportView.tsx';
import { LessonHead, ReportBlock } from './LessonHead';
import { LessonParts } from './LessonParts';
import { PortalFileList } from './PortalFileList';
import { usePortalLesson } from './use-recordings';

interface Props {
  student: PortalStudent;
  lessonId: string;
  onOpenReport: (report: OpenReport) => void;
}

function Body({ view, student, onOpenReport }: Omit<Props, 'lessonId'> & { view: PortalLessonAssets }) {
  const reportId = view.report_id;
  return (
    <div className="grid gap-4">
      <LessonHead view={view} student={student} level={2} />
      {/* Narrow: recording, report, files (the app's order). Wide: the recording over its files
          at the start, the report's lines beside them at the end. */}
      <div className="grid content-start items-start gap-5 @xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="empty:hidden @xl:col-start-1">
          <LessonParts student={student} recordings={view.recordings} />
        </div>
        {reportId && (
          <div className="grid gap-4 @xl:col-start-2 @xl:row-span-2 @xl:row-start-1">
            <ReportBlock reportId={reportId} onOpenReport={onOpenReport} />
          </div>
        )}
        <div className="@xl:col-start-1">
          <PortalFileList studentId={student.id} reportId={reportId} files={view.files} />
        </div>
      </div>
    </div>
  );
}

/**
 * The picked lesson in «التسجيلات» (boards FamRecWebList, FamRecWebParts): the recording, its
 * files and the report's first lines. A new pick mounts a new panel, which fades up in place.
 */
export function LessonPanel({ student, lessonId, onOpenReport }: Props) {
  const query = usePortalLesson({ studentId: student.id, lessonId });
  return (
    <Card asChild className="@container animate-fade-up p-5">
      <section aria-label={t.lessonFiles.lessonPage}>
        <QueryState query={query} rows={2}>
          {(view) => <Body view={view} student={student} onOpenReport={onOpenReport} />}
        </QueryState>
      </section>
    </Card>
  );
}
