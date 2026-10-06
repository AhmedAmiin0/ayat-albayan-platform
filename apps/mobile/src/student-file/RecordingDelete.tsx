import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { InlineConfirm } from '@/ui/InlineConfirm';
import { deleteError, useDeleteRecording } from './recording-actions';

const D = t.mobileStudentFile.recordings.delete;

/** Admin only: «حذف التسجيل» asks once more, then removes the file (the row stays as «محذوف»). */
export function RecordingDelete({ id, studentId }: { id: string; studentId: string }) {
  const [asking, setAsking] = useState(false);
  const remove = useDeleteRecording(studentId);
  if (!asking) {
    return (
      <View style={{ alignItems: 'flex-start' }}>
        <Button variant="ghost" label={D.action} onPress={() => setAsking(true)} />
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <InlineConfirm
        message={D.question}
        confirmLabel={remove.isPending ? D.deleting : D.confirm}
        busy={remove.isPending}
        onConfirm={() => remove.mutate(id, { onSuccess: () => setAsking(false) })}
        onCancel={() => setAsking(false)}
      />
      {remove.isError ? <ErrorLine message={deleteError(remove.error)} /> : null}
    </View>
  );
}
