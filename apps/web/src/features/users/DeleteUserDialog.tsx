import type { UserDetail } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { deleteUser, disableUser, USERS_KEY } from './api';
import { historyReferences, userErrorText } from './errors';
import { HistoryReferences } from './HistoryReferences';

const D = t.users.delete;

export interface DeleteUserDialogProps {
  user: UserDetail;
  onBack: () => void;
  onDone: (message: string) => void;
}

/** Confirms the delete; a user with history (409) lists the tables and offers to disable instead. */
export function DeleteUserDialog({ user, onBack, onDone }: DeleteUserDialogProps) {
  const queryClient = useQueryClient();
  // Close first: refetching the open detail of a deleted user would 404 and retry before the dialog could close.
  const finish = (message: string) => {
    onDone(message);
    queryClient.removeQueries({ queryKey: [...USERS_KEY, 'detail', user.id] });
    void queryClient.invalidateQueries({ queryKey: USERS_KEY });
  };
  const remove = useMutation({ mutationFn: deleteUser, onSuccess: () => finish(t.users.toast.deleted) });
  const disable = useMutation({ mutationFn: disableUser, onSuccess: () => finish(t.users.toast.disabled) });
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
