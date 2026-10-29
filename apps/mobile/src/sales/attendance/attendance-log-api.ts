import type { StudentAttendanceTable } from '@ab/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type Href, router } from 'expo-router';
import { apiFetch } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';
import type { TreeBase } from '@/core/nav/tree-base';
import { openStudentReportPdf } from '../student/student-api';

/** GET /sales/students/:id/attendance in the sales tree, the admin's GET /students/:id/attendance otherwise. */
export const attendancePath = (base: TreeBase, id: string): string =>
  base === '/sales' ? `/sales/students/${id}/attendance` : `/students/${id}/attendance`;

/** «سجل الحضور» of one month (null: the current Riyadh month); the last month stays on screen while the next loads. */
export function useAttendanceLog(base: TreeBase, id: string, month: string | null) {
  const path = attendancePath(base, id);
  const url = month ? `${path}?month=${month}` : path;
  return useQuery({
    queryKey: [...pathKey(path), month ?? 'current'],
    queryFn: () => apiFetch<StudentAttendanceTable>(url),
    enabled: id !== '',
    placeholderData: keepPreviousData,
  });
}

/**
 * A row's sent report: the PDF as «التقارير» opens it (sales), the admin's sent report view otherwise
 * (`to`: useStudentHref, the chat group's copy of the route when the log runs in one).
 */
export function openAttendanceReport(base: TreeBase, ids: { studentId: string; reportId: string }, to: (href: Href) => Href): Promise<void> {
  if (base === '/sales') return openStudentReportPdf(ids.studentId, ids.reportId);
  router.push(to(`/students/reports/view/${ids.reportId}`));
  return Promise.resolve();
}
