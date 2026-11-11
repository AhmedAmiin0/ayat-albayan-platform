import { teacherCancelSchema } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { Note } from '@/core/ui/feedback/Note';
import { Field } from '@/core/ui/form/Field';
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

/**
 * «إلغاء الحلقة» by the teacher (docs/46 D3): this lesson only, the reason required (zod:
 * teacherCancelSchema), then «تأكيد الإلغاء». Its own mutation to POST
 * /teachers/me/lessons/:id/cancel,
 * never the admin's cancel. The family and the admins are told the reason by the API.
 */
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
