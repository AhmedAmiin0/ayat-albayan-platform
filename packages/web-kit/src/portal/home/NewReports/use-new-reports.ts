import { newReportCount } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { portalReportsQuery } from '@ab/web-kit/portal/api';
import { useSeenReports } from '@ab/web-kit/portal/use-seen-reports';
import type { NewReportsProps } from './NewReports.types';

export function useNewReports({ studentId }: Pick<NewReportsProps, 'studentId'>) {
  const reports = useQuery(portalReportsQuery(studentId)).data?.reports ?? [];
  const count = newReportCount(reports, useSeenReports());
  return { count };
}
