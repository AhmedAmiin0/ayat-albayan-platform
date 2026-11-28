import { salesStudentFileCalls, studentAttendanceCalls } from '@ab/client-core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type Href, router } from 'expo-router';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import type { TreeBase } from '@/core/nav/tree-base';
import { openStudentReportPdf } from '@/sales/sales/student/student-api';
import { salesKeys } from '@/core/lib/keys';

/** GET /sales/students/:id/attendance in the sales tree, the admin's GET /students/:id/attendance otherwise. */
export const attendancePath = (base: TreeBase, id: string): string =>
  base === '/sales' ? `/sales/students/${id}/attendance` : `/students/${id}/attendance`;

const salesFile = salesStudentFileCalls({ apiFetch, apiSend });
const adminFile = studentAttendanceCalls({ apiFetch, apiSend });

const readerOf = (base: TreeBase) => (base === '/sales' ? salesFile.attendance : adminFile.table);

/** Null month means the current Riyadh month; the last month stays while the next loads. */
export function useAttendanceLog(base: TreeBase, id: string, month: string | null) {
  const read = readerOf(base);
  return useQuery({
    queryKey: salesKeys.attendance(attendancePath(base, id), month),
    queryFn: () => read({ studentId: id, month: month ?? undefined }),
    enabled: id !== '',
    placeholderData: keepPreviousData,
  });
}

/** A sales user gets the report PDF, otherwise the admin's sent report view. */
export function openAttendanceReport(
  base: TreeBase,
  ids: { studentId: string; reportId: string },
  to: (href: Href) => Href,
): Promise<void> {
  if (base === '/sales') return openStudentReportPdf(ids.studentId, ids.reportId);
  router.push(to(`/students/reports/view/${ids.reportId}`));
  return Promise.resolve();
}
