import {
  courseActionsKey,
  parsePackageCancelCheck,
  postPackageCancel,
  salesPackageCancelKey,
  salesPackageCancelPath,
} from '@ab/client-core';
import type { SalesCourseView, SalesStudentDetails } from '@ab/shared';
import { useQuery, type QueryKey } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';
import { useSalesCourse } from '@/sales-course';
import { openSigned } from '@/teacher';

/** GET /sales/students/:id — one of my students: subscriptions, attendance and sent reports (404 otherwise). */
export const useSalesStudent = (id: string) =>
  useQuery({
    queryKey: pathKey(`/sales/students/${id}`),
    queryFn: () => apiFetch<SalesStudentDetails>(`/sales/students/${id}`),
    enabled: id !== '',
  });

/** The weekly course on the student file (owner 2026-11-06: a link sale left unbooked). */
interface CourseState {
  /** «أيام الحلقات»: the package may be booked now (GET /sales/booking/course: blocked null). */
  book: boolean;
  /** «تغيير المعلم» / «تغيير موعد الحلقات»: a course runs or is booked ahead (`current`). */
  moves: boolean;
}

/**
 * From the assistant's course view: nothing to change before a course exists (no more
 * course_not_found); while it loads nothing shows, a failed read keeps the moves (as before).
 */
export const courseState = (
  view: SalesCourseView | undefined,
  failed: boolean,
): CourseState => ({
  book: view?.blocked === null,
  moves: view ? Boolean(view.current) : failed,
});

/** The course view of a student she acts on (owner 2026-11-06): «أيام الحلقات», or its moves. */
export function useCourseState(studentId: string, acts: boolean): CourseState {
  const course = useSalesCourse(acts ? studentId : '');
  return courseState(course.data, course.isError);
}

/** «تحميل PDF» of one of my student's sent reports: a 1 h signed URL opened in the browser. */
export const openStudentReportPdf = (studentId: string, reportId: string): Promise<void> =>
  openSigned(`/sales/students/${studentId}/reports/${reportId}/pdf`);

/** «إلغاء الباقة» (owner 2026-11-02): whether the cancel may run (block null), with the key. */
export const usePackageCancelCheck = (input: {
  subscriptionId: string | null;
  enabled: boolean;
}) => {
  const path = salesPackageCancelPath(input.subscriptionId ?? '');
  return useQuery({
    queryKey: salesPackageCancelKey(input.subscriptionId ?? ''),
    queryFn: async () => parsePackageCancelCheck(await apiFetch(path)),
    enabled: input.enabled && input.subscriptionId !== null,
    retry: false,
  });
};

/** POST { reason? }: the 409s are said by CancelPackage. */
export const cancelAnyPackage = (subscriptionId: string, body: { reason?: string }) =>
  postPackageCancel(apiFetch, subscriptionId, body);

/** What a cancel makes stale: as «إلغاء الاشتراك» (actions, student, sales, lessons, money). */
export const packageCancelStale = (studentId: string): QueryKey[] => [
  [...courseActionsKey(studentId)],
  pathKey('/students'),
  pathKey('/sales'),
  pathKey('/lessons'),
  pathKey('/subscriptions'),
];
