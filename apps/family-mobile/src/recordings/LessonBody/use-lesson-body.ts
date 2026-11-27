import { useReportPage } from '@/portal';
import type { LessonBodyProps } from './LessonBody.types';

export function useLessonBody({ view }: Pick<LessonBodyProps, 'view'>) {
  const reportId = view.report_id ?? '';
  const report = useReportPage(reportId);
  // Oldest part first, so the parts play in order.
  const parts = [...view.recordings].reverse();
  return { reportId, report, parts };
}
