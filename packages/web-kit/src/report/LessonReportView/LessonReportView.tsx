import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ReportPageBody } from '@ab/web-kit/report/ReportPageBody';
import type { Props } from './LessonReportView.types';
import { useLessonReportView } from './use-lesson-report-view';

/**
 * One lesson's saved report, read-only: the lines, the «edited» note, the attachments and the PDF.
 * Inside its row of the teacher's student file (docs/49) the page header is left out (the row
 * already says which lesson it is); the family's report screen (docs/50) shows it.
 */
export function LessonReportView({ reportId, head = false, fallback }: Props) {
  const { page } = useLessonReportView({ reportId });
  if (page.isError) return fallback ?? <p className="text-sm text-ink-3">{t.common.error}</p>;
  if (!page.data) return <ListSkeleton rows={2} />;
  return <ReportPageBody view={page.data} head={head} />;
}
