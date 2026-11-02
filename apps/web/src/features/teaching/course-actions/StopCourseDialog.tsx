import { courseStopErrorCode, stopRefundOf, type RefundChoice } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { useId, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Dialog } from '@/components/ui/overlay/dialog';
import { usePermissions } from '@/features/people/auth';
import { t } from '@/lib/i18n/i18n';
import { courseStopPreviewQuery, useStopCourse } from './api';
import { StopBody } from './StopSummary';

export interface CourseActionDialogProps {
  studentId: string;
  subscriptionId: string;
  onClose: () => void;
  /** After the write and the re-read: the caller's toast. */
  onDone: (message: string) => void;
}

/**
 * «إلغاء الاشتراك» (owner 2026-10-30): stop the course, keep the money. The sheet says what
 * happens, asks a short reason, then ONE «تأكيد الإلغاء»; one idempotency key per opening.
 * With subscriptions.refund and something to refund (owner 2026-11-02) it asks «إلغاء فقط» or
 * «إلغاء مع استرداد» first (never automatic; «إلغاء فقط» is the default).
 */
export function StopCourseDialog(props: CourseActionDialogProps) {
  const { studentId, subscriptionId, onClose } = props;
  const formId = useId();
  const [reason, setReason] = useState('');
  const [choice, setChoice] = useState<RefundChoice>('cancel');
  const [amount, setAmount] = useState('');
  const { can } = usePermissions();
  const preview = useQuery(courseStopPreviewQuery({ studentId, subscriptionId }));
  const currency = preview.data?.currency ?? '';
  const max = preview.data?.refund.refund ?? 0;
  const offered = can('subscriptions.refund') && max > 0;
  const asked = stopRefundOf({
    choice: offered ? choice : 'cancel',
    text: amount,
    refund: { max, currency },
  });
  const stop = useStopCourse({ ...props, reason, refund: asked.refund, currency });
  const live = preview.data?.stopped === null;
  const blocked = !live || reason.trim().length < 2 || !asked.valid || stop.isPending;
  const refund = offered ? { choice, onChoice: setChoice, amount, onAmount: setAmount } : null;
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!blocked) stop.mutate();
  };
  const error = preview.error ?? stop.error;
  const actions = (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button type="submit" form={formId} variant="danger" disabled={blocked}>
        {stop.isPending ? t.common.saving : t.courseActions.stop.confirm}
      </Button>
    </>
  );
  return (
    <Dialog layout="sheet" title={t.courseActions.stop.title} onClose={onClose} actions={actions}>
      <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
        {preview.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
        {preview.data && (
          <StopBody preview={preview.data} reason={reason} onReason={setReason} refund={refund} />
        )}
        {error && <FormAlert>{t.courseActions.errors[courseStopErrorCode(error)]}</FormAlert>}
      </form>
    </Dialog>
  );
}
