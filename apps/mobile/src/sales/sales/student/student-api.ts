import {
  courseActionsKey,
  parsePackageCancelCheck,
  postPackageCancel,
  salesPackageCancelKey,
  salesPackageCancelPath,
} from '@ab/client-core';
import type { SalesStudentDetails } from '@ab/shared';
import { useQuery, type QueryKey } from '@tanstack/react-query';
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
