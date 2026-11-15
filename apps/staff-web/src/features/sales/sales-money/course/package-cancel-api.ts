import {
  courseActionsKey,
  parsePackageCancelCheck,
  postPackageCancel,
  salesPackageCancelKey,
  salesPackageCancelPath,
} from '@ab/client-core';
import { queryOptions, useQueryClient } from '@tanstack/react-query';
import type { CancelBody } from '@/features/finance/subscriptions';
import { apiFetch } from '@/lib/http/api';

// «إلغاء الباقة» of the assistant (owner 2026-11-02): ANY student, subscriptions.stop.

/** GET: whether the cancel may run (block null); a 404 / 403 hides the button. */
export const salesPackageCancelQuery = (subscriptionId: string) =>
  queryOptions({
    queryKey: salesPackageCancelKey(subscriptionId),
    queryFn: async () =>
      parsePackageCancelCheck(await apiFetch(salesPackageCancelPath(subscriptionId))),
    retry: false,
  });

/** POST: the 409s are said by the dialog. */
export const cancelAnyPackage = (subscriptionId: string, body: CancelBody) =>
  postPackageCancel(apiFetch, subscriptionId, body);

/** After a cancel: what «إلغاء الاشتراك» refreshes (the student, lists, money, lessons, sales). */
export function useRefreshAfterPackageCancel(studentId: string): () => Promise<void> {
  const client = useQueryClient();
  return async () => {
    const keys = [courseActionsKey(studentId), ['students'], ['money'], ['lessons'], ['sales']];
    await Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
  };
}
