import { CANCEL_STATUS, type CancelRequest, type LessonStatus } from '@ab/shared';
import { useEffect } from 'react';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import {
  type StatusChange,
  type StatusRequest,
  useOptimisticStatus,
} from '@/core/lib/query/use-optimistic-status';

/** A confirm, or a cancel carrying its body (docs/10 routes 6 and 9). */
interface LessonChange extends StatusChange<LessonStatus> {
  cancel?: CancelRequest;
}

function request(change: LessonChange): StatusRequest {
  return change.cancel
    ? { method: 'POST', path: `/lessons/${change.id}/cancel`, body: change.cancel }
    : { method: 'POST', path: `/lessons/${change.id}/confirm` };
}

const NOTICE_MS = 5000;

function errorText(error: unknown): string {
  const code = error instanceof ApiError && typeof error.body === 'object' && error.body !== null
    ? (error.body as { code?: unknown }).code
    : undefined;
  return code === 'invalid_transition' ? t.lessons.invalidTransition : t.common.error;
}

/**
 * «تأكيد» / «إلغاء» on Today (R-MOB-02, R-MOB-03): the lesson shows its new status at once and
 * rolls back if the API refuses. One mutation for the whole screen, so a cancelled card that left
 * the list can still show its error when it comes back. A scope 'rule' cancel patches only this
 * lesson at once; its later lessons change on the refetch.
 */
export function useLessonAction() {
  const action = useOptimisticStatus<LessonStatus, LessonChange>({ path: '/lessons', request });
  const { isSuccess, reset } = action;
  useEffect(() => {
    if (!isSuccess) return undefined;
    const id = setTimeout(reset, NOTICE_MS);
    return () => clearTimeout(id);
  }, [isSuccess, reset]);
  const last = action.variables;
  const scope = last?.cancel?.scope;
  return {
    confirm: (id: string) => action.mutate({ id, status: 'confirmed' }),
    cancel: (id: string, cancel: CancelRequest) =>
      action.mutate({ id, status: CANCEL_STATUS[cancel.by], cancel }),
    busyId: action.isPending ? last?.id : undefined,
    errorFor: (id: string) => (action.isError && last?.id === id ? errorText(action.error) : undefined),
    /** Said once a change lands, for the 5s it stays: a cancelled card has left the list. */
    notice: !isSuccess
      ? undefined
      : scope === 'rule'
        ? t.lessons.seriesCancelled
        : scope
          ? t.lessons.cancelled
          : t.lessons.confirmed,
  };
}
