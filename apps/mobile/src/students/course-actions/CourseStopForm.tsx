import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { requestId as newRequestId } from '@/core/lib/http/request-id';
import { Field } from '@/core/ui/form/Field';
import { ErrorLine } from '@/inbox';
import { SheetActions } from '@/students/course-pause/SheetActions';
import { useStopCourse, useStopPreview, type SubRef } from './course-actions-api';
import { stopErrorText, stopLines, stoppedLines } from './course-actions-text';
import { SheetLines } from './SheetLines';

interface CourseStopFormProps {
  sub: SubRef;
  onDone: () => void;
  onClose: () => void;
}

/**
 * «إلغاء الاشتراك» (owner 2026-10-30): what happens (lessons cancelled, the schedule ends, payments
 * and history kept, the student «توقف»), the required reason, then the stop with one
 * clientRequestId per sheet (rule 8). A package already cancelled shows when and why instead.
 */
export function CourseStopForm({ sub, onDone, onClose }: CourseStopFormProps) {
  const [reason, setReason] = useState('');
  const [requestId] = useState(newRequestId);
  const preview = useStopPreview(sub);
  const stop = useStopCourse(sub.studentId);
  const s = t.courseActions.stop;
  if (!preview.data) {
    if (preview.isError) return <ErrorLine message={stopErrorText(preview.error)} />;
    return <SheetLines lines={[t.common.loading]} />;
  }
  const { stopped } = preview.data;
  if (stopped) return <SheetLines lines={stoppedLines(stopped)} />;
  const submit = () => {
    const text = reason.trim();
    if (text.length < 2) return;
    const body = { subscriptionId: sub.subscriptionId, reason: text, clientRequestId: requestId };
    stop.mutate(body, { onSuccess: onDone });
  };
  return (
    <View style={{ gap: 12 }}>
      <SheetLines lines={[s.intro, ...stopLines(preview.data)]} />
      <Field label={s.reason} placeholder={s.reasonHint} value={reason} onChangeText={setReason} />
      {stop.isError ? <ErrorLine message={stopErrorText(stop.error)} /> : null}
      <SheetActions label={s.confirm} busy={stop.isPending} onConfirm={submit} onCancel={onClose} />
    </View>
  );
}
