import type { UserDetail } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Dialog, FormAlert, t } from '@ab/web-kit';
import { userKeys } from '@/features/people/keys';
import { deleteUser, disableUser } from '@/features/people/users/api';
import { historyReferences, userErrorText } from '@/features/people/users/errors';
import { HistoryReferences } from '@/features/people/users/edit/HistoryReferences';

const D = t.users.delete;

export interface DeleteUserDialogProps {
  user: UserDetail;
  onBack: () => void;
  onDone: (message: string) => void;
}

/** Confirms the delete; a user with history (409) lists the tables and offers to disable. */
export function DeleteUserDialog({ user, onBack, onDone }: DeleteUserDialogProps) {
  const queryClient = useQueryClient();
  // Close first: refetching a deleted user's open detail would 404 and retry before the close.
  const finish = (message: string) => {
    onDone(message);
    queryClient.removeQueries({ queryKey: userKeys.detail(user.id) });
    void queryClient.invalidateQueries({ queryKey: userKeys.all });
  };
  const remove = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => finish(t.users.toast.deleted),
  });
  const disable = useMutation({
    mutationFn: disableUser,
    onSuccess: () => finish(t.users.toast.disabled),
  });
  const references = historyReferences(remove.error);
  const failed = disable.error ?? (references ? null : remove.error);
  return (
    <Dialog
      title={D.title}
      description={user.full_name}
      onClose={onBack}
      compact
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onBack}>
            {t.common.cancel}
          </Button>
          {references ? (
            <Button type="button" disabled={disable.isPending || user.status === 'disabled'} onClick={() => disable.mutate({ id: user.id })}>
              {D.disableInstead}
            </Button>
          ) : (
            <Button type="button" variant="danger" disabled={remove.isPending} onClick={() => remove.mutate(user.id)}>
              {D.confirm}
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-3">
        {references ? <HistoryReferences references={references} /> : <p className="text-sm text-ink">{D.body.replace('{name}', user.full_name)}</p>}
        {failed && <FormAlert>{userErrorText(failed)}</FormAlert>}
      </div>
    </Dialog>
  );
}
