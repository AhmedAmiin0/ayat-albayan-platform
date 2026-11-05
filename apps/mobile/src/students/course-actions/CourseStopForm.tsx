import { courseStopBody } from '@ab/client-core';
import type { CourseStopResult } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { requestId as newRequestId } from '@/core/lib/http/request-id';
import { Field } from '@/core/ui/form/Field';
import { ErrorLine } from '@/inbox';
import { SheetActions } from '@/students/course-pause/SheetActions';
import { useStopCourse, useStopPreview, type SubRef } from './course-actions-api';
import { doneText, stopErrorText, stopLines, stoppedLines } from './course-actions-text';
import { StopMoneyChoice, useStopMoney } from './StopMoneyChoice';
import { SheetLines } from './SheetLines';

interface CourseStopFormProps {
  sub: SubRef;
  /** After the stop: the notice («أُلغي…», with the refund's amount when there was one). */
  onDone: (text: string) => void;
  onClose: () => void;
}

/**
 * «إلغاء الاشتراك» (owner 2026-10-30): what happens (lessons cancelled, the schedule ends, payments
 * and history kept, the student «توقف»), the required reason, then the stop with one
 * clientRequestId per sheet (rule 8). A package already cancelled shows when and why instead.
 * The money is the person's choice (owner 2026-11-06): «إلغاء فقط» with what the family still
 * owes, or «إلغاء مع استرداد» with the refund amount, as on web.
 */
export function CourseStopForm({ sub, onDone, onClose }: CourseStopFormProps) {
  const [reason, setReason] = useState('');
  const [requestId] = useState(newRequestId);
  const preview = useStopPreview(sub);
  const stop = useStopCourse(sub.studentId);
  const view = useStopMoney(preview.data);
  const s = t.courseActions.stop;
  if (!preview.data) {
    if (preview.isError) return <ErrorLine message={stopErrorText(preview.error)} />;
    return <SheetLines lines={[t.common.loading]} />;
  }
  const { stopped, currency } = preview.data;
  if (stopped) return <SheetLines lines={stoppedLines(stopped)} />;
  const submit = () => {
    if (reason.trim().length < 2 || !view.ready) return;
    const input = { subscriptionId: sub.subscriptionId, reason, clientRequestId: requestId };
    const onSuccess = (result: CourseStopResult) => onDone(doneText(result, currency));
    stop.mutate(courseStopBody({ ...input, ask: view.ask }), { onSuccess });
  };
  const keeps = view.state.mode !== 'refund';
  return (
    <View style={{ gap: 12 }}>
      <SheetLines lines={[s.intro, ...stopLines(preview.data, keeps)]} />
      <StopMoneyChoice preview={preview.data} view={view} />
      <Field label={s.reason} placeholder={s.reasonHint} value={reason} onChangeText={setReason} />
      {view.problem ? <ErrorLine message={t.courseActions.errors[view.problem]} /> : null}
      {stop.isError ? <ErrorLine message={stopErrorText(stop.error)} /> : null}
      <SheetActions label={s.confirm} busy={stop.isPending} onConfirm={submit} onCancel={onClose} />
    </View>
  );
}
