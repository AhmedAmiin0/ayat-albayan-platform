import { useState } from 'react';
import { View } from 'react-native';
import { t, Button, ErrorLine } from '@ab/mobile-kit';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { deleteError, useDeleteRecording } from './recording-actions';

const D = t.mobileStudentFile.recordings.delete;

/** Admin only; asks once more, then removes the file while the row stays as deleted. */
export function RecordingDelete({ id, studentId }: { id: string; studentId: string }) {
  const [asking, setAsking] = useState(false);
  const remove = useDeleteRecording(studentId);
  if (!asking) {
    return <Button variant="danger" label={D.action} onPress={() => setAsking(true)} />;
  }
  return (
    <View style={{ gap: 8 }}>
      <InlineConfirm
        tone="danger"
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
