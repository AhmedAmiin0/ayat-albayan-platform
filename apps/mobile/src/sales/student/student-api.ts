import type { SalesStudentDetails } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';
import { openSigned } from '@/teacher';

/** GET /sales/students/:id — one of my students: subscriptions, attendance and sent reports (404 otherwise). */
export const useSalesStudent = (id: string) =>
  useQuery({
    queryKey: pathKey(`/sales/students/${id}`),
    queryFn: () => apiFetch<SalesStudentDetails>(`/sales/students/${id}`),
    enabled: id !== '',
  });

/** «تحميل PDF» of one of my student's sent reports: a 1 h signed URL opened in the browser. */
export const openStudentReportPdf = (studentId: string, reportId: string): Promise<void> =>
  openSigned(`/sales/students/${studentId}/reports/${reportId}/pdf`);
