import { lessonWhenAt } from '@ab/shared';
import { useClock } from '@ab/web-kit/lib/clock';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { reportLines } from '@ab/web-kit/report/lines';
import type { ReportPageBodyProps } from './ReportPageBody.types';

export function useReportPageBody({ view }: Pick<ReportPageBodyProps, 'view'>) {
  const clock = useClock();
  const s = t.reportPage;
  const when = lessonWhenAt(new Date(view.lesson.starts_at), { tz: view.tz, ...clock });
  const lines = reportLines(view.report);
  return { s, when, lines };
}
