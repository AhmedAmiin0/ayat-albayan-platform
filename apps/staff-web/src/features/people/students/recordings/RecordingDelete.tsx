import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Icon, ApiError, t } from '@ab/web-kit';
import { ConfirmDialog } from '@/features/finance/payments/record/ConfirmDialog';
import { deleteRecording, RECORDINGS_KEY } from './recordings-api';

const R = t.studentRecordings.delete;

/** Admin only; removes the file but the row stays marked deleted. */
export function RecordingDelete({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => deleteRecording(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: RECORDINGS_KEY });
      setOpen(false);
    },
  });
  const busy = remove.isError && remove.error instanceof ApiError && remove.error.status === 409;
  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Icon name="trash" />
        {R.action}
      </Button>
      {open && (
        <ConfirmDialog
          title={R.title}
          confirmLabel={R.confirm}
          pending={remove.isPending}
          error={remove.isError ? (busy ? R.inProgress : R.failed) : null}
          onConfirm={() => remove.mutate()}
          onClose={() => setOpen(false)}
        >
          <p className="text-sm text-ink-2">{R.body}</p>
        </ConfirmDialog>
      )}
    </>
  );
}
