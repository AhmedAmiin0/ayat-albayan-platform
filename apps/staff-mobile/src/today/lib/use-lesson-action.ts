import { CANCEL_STATUS, type CancelRequest, type CorrectTo, type LessonStatus } from '@ab/shared';
import { useEffect } from 'react';
import { ApiError, t } from '@ab/mobile-kit';
import {
  type StatusChange,
  type StatusRequest,
  useOptimisticStatus,
} from '@/core/lib/query/use-optimistic-status';

/** A cancel carries its body (docs/10 routes 6 and 9). */
interface LessonChange extends StatusChange<LessonStatus> {
  cancel?: CancelRequest;
  /** POST /lessons/:id/correct { to } (owner 2026-11-03). */
  correct?: CorrectTo;
}

function request(change: LessonChange): StatusRequest {
  const { correct } = change;
  if (correct) return { method: 'POST', path: `/lessons/${change.id}/correct`, body: { to: correct } };
  return change.cancel
    ? { method: 'POST', path: `/lessons/${change.id}/cancel`, body: change.cancel }
    : { method: 'POST', path: `/lessons/${change.id}/confirm` };
}

const NOTICE_MS = 5000;

/** A refused change in words (docs/10 §3: clients switch on `code`). */
const ERROR_TEXT: Record<string, string | undefined> = {
  invalid_transition: t.lessons.invalidTransition,
  not_auto_held: t.lessons.error.not_auto_held,
  earning_paid: t.lessons.error.earning_paid,
};

/** What a landed change says, by kind (a cancel by its scope). */
type NoticeKind = 'rule' | 'one' | 'confirm' | 'correct';
const NOTICE: Record<NoticeKind, string> = {
  rule: t.lessons.seriesCancelled,
  one: t.lessons.cancelled,
  confirm: t.lessons.confirmed,
  correct: t.lessons.correct.done,
};
const noticeKind = (last: LessonChange | undefined): NoticeKind =>
  last?.correct ? 'correct' : (last?.cancel?.scope ?? 'confirm');

function errorText(error: unknown): string {
  const code = error instanceof ApiError && typeof error.body === 'object' && error.body !== null
    ? (error.body as { code?: unknown }).code
    : undefined;
  return (typeof code === 'string' && ERROR_TEXT[code]) || t.common.error;
}

/** Optimistic with rollback (R-MOB-02, R-MOB-03); one mutation keeps a returning card's error. */
export function useLessonAction() {
  const action = useOptimisticStatus<LessonStatus, LessonChange>({ path: '/lessons', request });
  const { isSuccess, reset } = action;
  useEffect(() => {
    if (!isSuccess) return undefined;
    const id = setTimeout(reset, NOTICE_MS);
    return () => clearTimeout(id);
  }, [isSuccess, reset]);
  const last = action.variables;
  return {
    confirm: (id: string) => action.mutate({ id, status: 'confirmed' }),
    cancel: (id: string, cancel: CancelRequest) =>
      action.mutate({ id, status: CANCEL_STATUS[cancel.by], cancel }),
    correct: (id: string, to: CorrectTo) => action.mutate({ id, status: to, correct: to }),
    busyId: action.isPending ? last?.id : undefined,
    errorFor: (id: string) => (action.isError && last?.id === id ? errorText(action.error) : undefined),
    /** Said once a change lands, for the 5s it stays: a cancelled card has left the list. */
    notice: isSuccess ? NOTICE[noticeKind(last)] : undefined,
  };
}
