import { useQuery } from '@tanstack/react-query';
import { portalReportsQuery } from '@ab/web-kit';
import type { ReportsProps } from './Reports.types';

export function useReports({ student }: ReportsProps) {
  const query = useQuery(portalReportsQuery(student.id));
  return { query };
}
