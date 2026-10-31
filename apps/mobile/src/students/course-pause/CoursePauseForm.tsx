import { riyadhToday, type CoursePauseStart } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { StartDayPicker } from '@/assistants';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorLine } from '@/inbox';
import { Note } from '@/more';
import { Field } from '@/core/ui/form/Field';
import { useStartPause } from './course-pause-api';
import { pauseErrorText } from './course-pause-text';
import { SheetActions } from './SheetActions';
import { PausePreviewLine } from './PausePreviewLine';
import { UntilField } from './UntilField';

interface CoursePauseFormProps {
  studentId: string;
  /** Saved: the sheet closes and the file says «أُوقفت الدورة مؤقتًا». */
  onDone: () => void;
  onClose: () => void;
}

const bodyOf = (draft: { from: string; until: string | null; reason: string }): CoursePauseStart => {
  const reason = draft.reason.trim();
  return { fromDate: draft.from, untilDate: draft.until, ...(reason ? { reason } : {}) };
};

/**
 * «إيقاف الدورة مؤقتًا» (owner 2026-10-28): from (Riyadh today by default, never a past day), until (optional:
 * none = until «استئناف»), the reason (optional), the live count of the lessons it cancels and the note that
 * no message goes to the family. One primary «إيقاف الدورة» beside «إلغاء», equal widths.
 */
export function CoursePauseForm({ studentId, onDone, onClose }: CoursePauseFormProps) {
  // academy day (docs/34 b): a pause cuts at the academy's today.
  const [today] = useState(() => riyadhToday());
  const [from, setFrom] = useState(today);
  const [until, setUntil] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const start = useStartPause(studentId);
  const c = t.coursePause;
  const pickFrom = (day: string) => {
    setFrom(day);
    if (until !== null && until < day) setUntil(day);
  };
  const submit = () => start.mutate(bodyOf({ from, until, reason }), { onSuccess: onDone });
  return (
    <View style={{ gap: 16 }}>
      <StartDayPicker label={c.from} day={from} min={today} onChange={pickFrom} />
      <UntilField from={from} until={until} onChange={setUntil} />
      <Field label={c.reason} placeholder={c.reasonHint} value={reason} onChangeText={setReason} />
      <PausePreviewLine studentId={studentId} from={from} until={until} />
      <Note>{c.noMessage}</Note>
      {start.isError ? <ErrorLine message={pauseErrorText(start.error)} /> : null}
      <SheetActions label={c.confirm} busy={start.isPending} onConfirm={submit} onCancel={onClose} />
    </View>
  );
}
