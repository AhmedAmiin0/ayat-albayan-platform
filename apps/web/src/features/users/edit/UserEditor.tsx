import type { UserDetail, UserRoleOption } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { updateUser, USERS_KEY } from '../api';
import { DeleteUserDialog } from '../actions/DeleteUserDialog';
import { DisableDialog } from '../actions/DisableDialog';
import { editBody, editErrors, initialEditForm, type EditForm } from './edit-form';
import { userErrorText } from '../errors';
import { ResetPasswordDialog } from '../actions/ResetPasswordDialog';
import { UserActions, type ActionMode } from '../actions/UserActions';
import { UserEditFields } from './UserEditFields';
import { UserSummary } from './UserSummary';
import type { FormErrors } from '../validation';

export interface UserEditorProps {
  user: UserDetail;
  options: readonly UserRoleOption[];
  canWrite: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** One user in the side panel: the fields, and (with users.write) save and the account actions. */
export function UserEditor({ user, options, canWrite, onClose, onDone }: UserEditorProps) {
  const queryClient = useQueryClient();
  const formId = useId();
  const [form, setForm] = useState<EditForm>(() => initialEditForm(user, options));
  const [errors, setErrors] = useState<FormErrors>({});
  const [mode, setMode] = useState<ActionMode | null>(null);
  const save = useMutation({
    mutationFn: updateUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: USERS_KEY });
      onDone(t.users.toast.saved);
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = editErrors(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const body = editBody(user, form, options);
    if (body) save.mutate({ id: user.id, body });
    else onClose();
  };
  const back = () => setMode(null);
  if (mode === 'disable') return <DisableDialog user={user} onBack={back} onDone={onDone} />;
  if (mode === 'reset') return <ResetPasswordDialog user={user} onBack={back} onClose={onClose} />;
  if (mode === 'delete') return <DeleteUserDialog user={user} onBack={back} onDone={onDone} />;
  return (
    <Dialog
      title={t.users.detail.title}
      description={user.full_name}
      onClose={onClose}
      wide
      hint={canWrite ? undefined : t.users.detail.readOnly}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          {canWrite && (
            <Button type="submit" form={formId} disabled={save.isPending}>
              {t.users.detail.save}
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-4">
        <UserSummary user={user} />
        <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
          <UserEditFields form={form} onChange={setForm} errors={errors} options={options} readOnly={!canWrite} roleLocked={!!user.linked} />
          {save.error && <FormAlert>{userErrorText(save.error)}</FormAlert>}
        </form>
        {canWrite && <UserActions user={user} onMode={setMode} onDone={onDone} />}
      </div>
    </Dialog>
  );
}
