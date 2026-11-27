import { useChildReports } from '@/portal';
import type { OwnReportsProps } from './OwnReports.types';

export function useOwnReports({ student }: OwnReportsProps) {
  const reports = useChildReports(student.id);
  return { reports };
}
