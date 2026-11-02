import { courseStopBody, stopRefundOf, type RefundChoice as Choice } from '@ab/client-core';
import type { CourseStopPreview, CourseStopResult } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { useHolds } from '@/core/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { requestId as newRequestId } from '@/core/lib/http/request-id';
import { Field } from '@/core/ui/form/Field';
import { ErrorLine } from '@/inbox';
import { SheetActions } from '@/students/course-pause/SheetActions';
import { useStopCourse, useStopPreview, type SubRef } from './course-actions-api';
import { doneText, stopErrorText, stopLines, stoppedLines } from './course-actions-text';
import { RefundChoice } from './RefundChoice';
import { SheetLines } from './SheetLines';

interface CourseStopFormProps {
  sub: SubRef;
  /** After the stop: the notice («أُلغي…», with the refund's amount when there was one). */
  onDone: (text: string) => void;
  onClose: () => void;
}

/** «إلغاء مع استرداد» is offered with subscriptions.refund and something to refund. */
function useRefund(preview: CourseStopPreview | undefined) {
  const [choice, setChoice] = useState<Choice>('cancel');
  const [amount, setAmount] = useState('');
  const max = preview?.refund.refund ?? 0;
  const offered = useHolds('subscriptions.refund') && max > 0;
  const refund = { max, currency: preview?.currency ?? '' };
  const asked = stopRefundOf({ choice: offered ? choice : 'cancel', text: amount, refund });
  const state = { choice, onChoice: setChoice, amount, onAmount: setAmount };
  return { asked, state: offered ? state : null };
}

/**
 * «إلغاء الاشتراك» (owner 2026-10-30): what happens (lessons cancelled, the schedule ends, payments
 * and history kept, the student «توقف»), the required reason, then the stop with one
 * clientRequestId per sheet (rule 8). A package already cancelled shows when and why instead.
 * «إلغاء فقط» / «إلغاء مع استرداد» (owner 2026-11-02): the person's choice, as on web.
 */
export function CourseStopForm({ sub, onDone, onClose }: CourseStopFormProps) {
  const [reason, setReason] = useState('');
  const [requestId] = useState(newRequestId);
  const preview = useStopPreview(sub);
  const stop = useStopCourse(sub.studentId);
  const { asked, state } = useRefund(preview.data);
  const s = t.courseActions.stop;
  if (!preview.data) {
    if (preview.isError) return <ErrorLine message={stopErrorText(preview.error)} />;
    return <SheetLines lines={[t.common.loading]} />;
  }
  const { stopped, currency } = preview.data;
  if (stopped) return <SheetLines lines={stoppedLines(stopped)} />;
  const submit = () => {
    if (reason.trim().length < 2 || !asked.valid) return;
    const input = { subscriptionId: sub.subscriptionId, reason, clientRequestId: requestId };
    const onSuccess = (result: CourseStopResult) => onDone(doneText(result, currency));
    stop.mutate(courseStopBody({ ...input, refund: asked.refund }), { onSuccess });
  };
  const keeps = state?.choice !== 'refund';
  return (
    <View style={{ gap: 12 }}>
      <SheetLines lines={[s.intro, ...stopLines(preview.data, keeps)]} />
      {state ? <RefundChoice preview={preview.data} {...state} /> : null}
      <Field label={s.reason} placeholder={s.reasonHint} value={reason} onChangeText={setReason} />
      {stop.isError ? <ErrorLine message={stopErrorText(stop.error)} /> : null}
      <SheetActions label={s.confirm} busy={stop.isPending} onConfirm={submit} onCancel={onClose} />
    </View>
  );
}
