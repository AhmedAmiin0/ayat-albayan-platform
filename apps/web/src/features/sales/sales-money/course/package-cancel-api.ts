import {
  courseActionsKey,
  parsePackageCancelCheck,
  salesPackageCancelKey,
  salesPackageCancelPath,
} from '@ab/client-core';
import { salesPackageCancelledSchema } from '@ab/shared';
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

/** POST: 409 already_cancelled, has_payments, has_lessons or has_commission (in the dialog). */
export async function cancelAnyPackage(subscriptionId: string, body: CancelBody) {
  const init = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
  const answer = await apiFetch(salesPackageCancelPath(subscriptionId), {
    ...init,
    body: JSON.stringify(body),
  });
  return salesPackageCancelledSchema.parse(answer);
}

/** After a cancel: what «إلغاء الاشتراك» refreshes (the student, lists, money, lessons, sales). */
export function useRefreshAfterPackageCancel(studentId: string): () => Promise<void> {
  const client = useQueryClient();
  return async () => {
    const keys = [courseActionsKey(studentId), ['students'], ['money'], ['lessons'], ['sales']];
    await Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
  };
}
