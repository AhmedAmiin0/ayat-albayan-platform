import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { deleteRole, ROLES_KEY, roleErrorText, type RoleView } from './api';

export interface DeleteRoleDialogProps {
  role: RoleView;
  onClose: () => void;
  onDeleted: () => void;
}

/** Confirm a delete; a role that still has users shows why it cannot go and offers no confirm. */
export function DeleteRoleDialog({ role, onClose, onDeleted }: DeleteRoleDialogProps) {
  const queryClient = useQueryClient();
  const blocked = role.user_count > 0;
  const remove = useMutation({
    mutationFn: () => deleteRole(role.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ROLES_KEY });
      onDeleted();
    },
  });
  return (
    <Dialog
      compact
      title={t.roles.delete.title}
      onClose={onClose}
      glyph={{ tone: 'bad', shape: 'struck' }}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {blocked ? t.common.close : t.common.cancel}
          </Button>
          {!blocked && (
            <Button type="button" variant="danger" disabled={remove.isPending} onClick={() => remove.mutate()}>
              {t.roles.action.confirmDelete}
            </Button>
          )}
        </>
      }
    >
      {blocked ? (
        <p role="alert">{t.roles.delete.blocked.replace('{count}', String(role.user_count))}</p>
      ) : (
        <p>{t.roles.delete.body.replace('{name}', role.name_ar)}</p>
      )}
      {remove.isError && <FormAlert className="mt-3">{roleErrorText(remove.error)}</FormAlert>}
    </Dialog>
  );
}
