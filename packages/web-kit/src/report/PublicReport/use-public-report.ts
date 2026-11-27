import { useQuery } from '@tanstack/react-query';
import { needsCode, publicPageQuery } from '@ab/web-kit/report/public-api';
import type { PublicReportProps } from './PublicReport.types';

export function usePublicReport({ publicId }: Pick<PublicReportProps, 'publicId'>) {
  const page = useQuery(publicPageQuery(publicId));
  const gate = page.isError && needsCode(page.error);
  return { page, gate };
}
