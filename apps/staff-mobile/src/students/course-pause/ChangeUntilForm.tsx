import type { CoursePauseView } from '@ab/shared';
import { riyadhToday } from '@ab/time';
import { useState } from 'react';
import { View } from 'react-native';
import { t, ErrorLine } from '@ab/mobile-kit';
import { useChangeUntil } from './course-pause-api';
import { pauseErrorText } from './course-pause-text';
import { SheetActions } from './SheetActions';
import { UntilField } from './UntilField';

interface ChangeUntilFormProps {
  studentId: string;
  pause: CoursePauseView;
  onDone: () => void;
  onClose: () => void;
}

/** The end is never before the pause's first day nor before Riyadh today. */
export function ChangeUntilForm({ studentId, pause, onDone, onClose }: ChangeUntilFormProps) {
  const [earliest] = useState(() => {
    // academy day (docs/34 b): a pause cuts at the academy's today.
    const today = riyadhToday();
    return pause.from_date > today ? pause.from_date : today;
  });
  const [until, setUntil] = useState<string | null>(pause.until_date);
  const change = useChangeUntil(studentId);
  const c = t.coursePause;
  const save = () => change.mutate(until, { onSuccess: onDone });
  return (
    <View style={{ gap: 16 }}>
      <UntilField from={earliest} until={until} onChange={setUntil} />
      {change.isError ? <ErrorLine message={pauseErrorText(change.error)} /> : null}
      <SheetActions label={c.save} busy={change.isPending} onConfirm={save} onCancel={onClose} />
    </View>
  );
}
