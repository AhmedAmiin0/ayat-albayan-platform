import { teacherCancelSchema } from '@ab/schedule';
import { useState } from 'react';
import { View } from 'react-native';
import { t, Field, ErrorLine } from '@ab/mobile-kit';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { Note } from '@/core/ui/feedback/Note';
import { teacherActionError, useTeacherCancel } from './teacher-lesson-api';

interface TeacherCancelFormProps {
  lessonId: string;
  onClose: () => void;
  /** Said once the cancel lands (the card may leave the list with it). */
  onDone: (text: string) => void;
}

const w = t.teacherBoard;

/** The line under the reason: a missing reason once she tried, else a refused request. */
function problemOf(missing: boolean, failure: unknown): string | null {
  if (missing) return w.reasonRequired;
  return failure ? teacherActionError(failure) : null;
}

/** Required reason (docs/46 D3) on its own endpoint; the API tells the family and the admins. */
export function TeacherCancelForm({ lessonId, onClose, onDone }: TeacherCancelFormProps) {
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const cancel = useTeacherCancel(lessonId);
  const parsed = teacherCancelSchema.safeParse({ reason });
  const problem = problemOf(tried && !parsed.success, cancel.error);
  const submit = () => {
    setTried(true);
    if (!parsed.success || cancel.isPending) return;
    cancel.mutate(parsed.data, { onSuccess: () => onDone(w.cancelledOk) });
  };
  return (
    <View style={{ gap: 10 }} testID="teacher-cancel-form">
      <Note>{w.cancelHint}</Note>
      <Field label={w.reason} required value={reason} onChangeText={setReason} maxLength={500} />
      {problem ? <ErrorLine message={problem} /> : null}
      <InlineConfirm
        tone="danger"
        message={w.cancelTitle}
        confirmLabel={cancel.isPending ? t.common.saving : w.cancelSubmit}
        cancelLabel={w.keep}
        busy={cancel.isPending}
        onConfirm={submit}
        onCancel={onClose}
      />
    </View>
  );
}
