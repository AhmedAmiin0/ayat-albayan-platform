import { courseStopBody, stopFormCheck, type StopDone } from '@ab/client-core';
import type { CourseStopResult } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t, Field, ErrorLine } from '@ab/mobile-kit';
import { requestId as newRequestId } from '@/core/lib/http/request-id';
import { useViewerTz } from '@/core/lib/clock';
import { Note } from '@/more';
import { SheetActions } from '@/students/course-pause/SheetActions';
import { useStopCourse, useStopPreview, type SubRef } from './course-actions-api';
import { stopDoneOf, stopErrorText, stopLines, stoppedLines } from './course-actions-text';
import { StopDoneView } from './StopDoneView';
import { StopMoneyChoice, useStopMoney } from './StopMoneyChoice';
import { SheetLines } from './SheetLines';

interface CourseStopFormProps {
  sub: SubRef;
  onDone: (text: string) => void;
  onClose: () => void;
  chatPhone?: string | undefined;
}

/** Required reason and one clientRequestId per sheet (rule 8); the money is the user's choice. */
export function CourseStopForm({ sub, onDone, onClose, chatPhone }: CourseStopFormProps) {
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const [requestId] = useState(newRequestId);
  const tz = useViewerTz();
  const preview = useStopPreview(sub);
  const stop = useStopCourse(sub.studentId);
  const view = useStopMoney(preview.data);
  const [finished, setFinished] = useState<StopDone | null>(null);
  const s = t.courseActions.stop;
  if (finished) {
    const close = () => onDone(finished.head);
    return <StopDoneView done={finished} chatPhone={chatPhone} onClose={close} />;
  }
  if (!preview.data) {
    if (preview.isError) return <ErrorLine message={stopErrorText(preview.error)} />;
    return <SheetLines lines={[t.common.loading]} />;
  }
  const { stopped, currency } = preview.data;
  if (stopped) return <SheetLines lines={stoppedLines(stopped)} />;
  const check = stopFormCheck({ money: view.result, text: view.state.text, reason, tried });
  const submit = () => {
    setTried(true);
    if (check.blocked) return;
    const input = { subscriptionId: sub.subscriptionId, reason, clientRequestId: requestId };
    const onSuccess = (result: CourseStopResult) => setFinished(stopDoneOf(result, currency));
    stop.mutate(courseStopBody({ ...input, ask: view.ask }), { onSuccess });
  };
  const keeps = view.state.mode !== 'refund';
  return (
    <View style={{ gap: 12 }}>
      <SheetLines lines={[s.intro, ...stopLines({ preview: preview.data, keeps, tz })]} />
      <StopMoneyChoice preview={preview.data} view={view} />
      <Field label={`${s.reason} *`} placeholder={s.reasonHint} value={reason} onChangeText={setReason} />
      {check.reason ? <ErrorLine message={s.reasonRequired} /> : null}
      {check.money ? <ErrorLine message={t.courseActions.errors[check.money]} /> : null}
      <Note>{t.courseCard.notifyNone}</Note>
      {stop.isError ? <ErrorLine message={stopErrorText(stop.error)} /> : null}
      <SheetActions
        label={s.confirm}
        busy={stop.isPending}
        onConfirm={submit}
        onCancel={onClose}
        danger
      />
    </View>
  );
}
