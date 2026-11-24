import type { StudentAttendanceTable } from '@ab/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type Href, router } from 'expo-router';
import { apiFetch, pathKey } from '@ab/mobile-kit';
import type { TreeBase } from '@/core/nav/tree-base';
import { openStudentReportPdf } from '@/sales/sales/student/student-api';

/** GET /sales/students/:id/attendance in the sales tree, the admin's GET /students/:id/attendance otherwise. */
export const attendancePath = (base: TreeBase, id: string): string =>
  base === '/sales' ? `/sales/students/${id}/attendance` : `/students/${id}/attendance`;

/** Null month means the current Riyadh month; the last month stays while the next loads. */
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

/** A sales user gets the report PDF, otherwise the admin's sent report view. */
export function openAttendanceReport(base: TreeBase, ids: { studentId: string; reportId: string }, to: (href: Href) => Href): Promise<void> {
  if (base === '/sales') return openStudentReportPdf(ids.studentId, ids.reportId);
  router.push(to(`/students/reports/view/${ids.reportId}`));
  return Promise.resolve();
}
