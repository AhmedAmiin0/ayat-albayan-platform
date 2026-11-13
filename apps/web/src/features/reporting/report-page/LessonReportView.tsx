import { useQuery } from '@tanstack/react-query';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { t } from '@/lib/i18n/i18n';
import { reportPageByIdQuery } from './api';
import { ReportPageBody } from './ReportPageBody';

/**
 * One lesson's saved report, read-only, inside its row of the teacher's student file (docs/49):
 * the lines, the «edited» note, the attachments and the PDF. The page header (names, the
 * student's zone) is left out: the row already says which lesson it is.
 */
export function LessonReportView({ reportId }: { reportId: string }) {
  const page = useQuery(reportPageByIdQuery(reportId));
  if (page.isError) return <p className="text-sm text-ink-3">{t.common.error}</p>;
  if (!page.data) return <ListSkeleton rows={2} />;
  return <ReportPageBody view={page.data} head={false} />;
}
