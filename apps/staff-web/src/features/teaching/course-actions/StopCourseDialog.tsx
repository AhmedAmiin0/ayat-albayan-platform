import { courseStopErrorCode, stopFormCheck, type StopDone } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { useId, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { courseStopPreviewQuery, useStopCourse } from './api';
import { useStopMoney } from './refund/use-stop-money';
import { StopBody } from './StopSummary';
import { StopDoneDialog, type StopChat } from './StopDoneDialog';

export interface CourseActionDialogProps {
  studentId: string;
  subscriptionId: string;
  onClose: () => void;
  /** After the write and the re-read: the caller's toast. */
  onDone: (message: string) => void;
}

interface StopCourseDialogProps extends CourseActionDialogProps {
  /** The done block's «فتح محادثة ولي الأمر» (absent: no button). */
  chat?: StopChat | undefined;
}

/**
 * «إلغاء الاشتراك» (owner 2026-10-30): stop the course, keep the money. The sheet says what
 * happens (the lessons and their dates, who is told), asks a short reason (owner 2026-11-17: a
 * clear error when it is empty), then ONE danger «تأكيد الإلغاء» beside «رجوع»; one idempotency
 * key per opening.
 * The money is the person's choice (owner 2026-11-06): «إلغاء فقط» with what the family still
 * owes, or (subscriptions.refund, something paid) «إلغاء مع استرداد» with the refund amount.
 * Then the done block (StopDoneDialog); its «تم» leaves the head as the caller's toast.
 */
export function StopCourseDialog(props: StopCourseDialogProps) {
  const { studentId, subscriptionId, onClose } = props;
  const formId = useId();
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const preview = useQuery(courseStopPreviewQuery({ studentId, subscriptionId }));
  const currency = preview.data?.currency ?? '';
  const money = useStopMoney(preview.data);
  const check = stopFormCheck({ money: money.money, text: money.state.text, reason, tried });
  const ask = money.money?.ask ?? {};
  const [finished, setFinished] = useState<StopDone | null>(null);
  const stop = useStopCourse({ ...props, reason, ask, currency, onDone: setFinished });
  const live = preview.data?.stopped === null;
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    setTried(true);
    if (live && !check.blocked && !stop.isPending) stop.mutate();
  };
  if (finished) {
    const close = () => props.onDone(finished.head);
    return <StopDoneDialog done={finished} chat={props.chat} onClose={close} />;
  }
  const error = preview.error ?? stop.error;
  const actions = (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>
        {t.common.back}
      </Button>
      <Button type="submit" form={formId} variant="danger" disabled={!live || stop.isPending}>
        {stop.isPending ? t.common.saving : t.courseActions.stop.confirm}
      </Button>
    </>
  );
  return (
    <Dialog layout="sheet" title={t.courseActions.stop.title} onClose={onClose} actions={actions}>
      <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
        {preview.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
        {preview.data && (
          <StopBody
            preview={preview.data}
            reason={{ value: reason, onChange: setReason, missing: check.reason }}
            money={money}
          />
        )}
        {check.money && <FormAlert>{t.courseActions.errors[check.money]}</FormAlert>}
        {error && <FormAlert>{t.courseActions.errors[courseStopErrorCode(error)]}</FormAlert>}
      </form>
    </Dialog>
  );
}
