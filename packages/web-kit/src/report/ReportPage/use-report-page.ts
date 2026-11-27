import { useQuery } from '@tanstack/react-query';
import { reportPageQuery } from '@ab/web-kit/report/api';
import type { ReportPageProps } from './ReportPage.types';

export function useReportPage({ publicId }: Pick<ReportPageProps, 'publicId'>) {
  const query = useQuery(reportPageQuery(publicId));
  return { query };
}
