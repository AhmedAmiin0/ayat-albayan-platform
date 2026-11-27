import { courseActionsKey, salesPackageCancelCalls, salesPackageCancelKey } from '@ab/client-core';
import { queryOptions, useQueryClient } from '@tanstack/react-query';
import type { CancelBody } from '@/features/finance/subscriptions';
import { apiFetch, apiSend } from '@ab/web-kit';

// The assistant may cancel any student's package with subscriptions.stop.

const packageCancel = salesPackageCancelCalls({ apiFetch, apiSend });

/** GET: whether the cancel may run (block null); a 404 / 403 hides the button. */
export const salesPackageCancelQuery = (subscriptionId: string) =>
  queryOptions({
    queryKey: salesPackageCancelKey(subscriptionId),
    queryFn: () => packageCancel.check(subscriptionId),
    retry: false,
  });

/** POST: the 409s are said by the dialog. */
export const cancelAnyPackage = (subscriptionId: string, body: CancelBody) =>
  packageCancel.cancel({ subscriptionId, body });

export function useRefreshAfterPackageCancel(studentId: string): () => Promise<void> {
  const client = useQueryClient();
  return async () => {
    const keys = [courseActionsKey(studentId), ['students'], ['money'], ['lessons'], ['sales']];
    await Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
  };
}
