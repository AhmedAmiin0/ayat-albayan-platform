import { useQuery } from '@tanstack/react-query';
import { reportPageByIdQuery } from '@ab/web-kit/report/api';
import type { Props } from './LessonReportView.types';

export function useLessonReportView({ reportId }: Pick<Props, 'reportId'>) {
  const page = useQuery(reportPageByIdQuery(reportId));
  return { page };
}
