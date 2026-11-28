import type { IssuedCredential } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type SubmitEvent } from 'react';
import { Button, Dialog, FormAlert, t } from '@ab/web-kit';
import { createUser, roleOptionsQuery, USERS_KEY } from '@/features/people/users/api';
import { initialCreateForm, type CreateForm, type Prefill } from './create-form';
import { CreateUserFields } from './CreateUserFields';
import { CredentialResult } from './CredentialResult';
import { userErrorText } from '@/features/people/users/errors';
import { createBody, createErrors, type FormErrors } from '@/features/people/users/validation';

const C = t.users.create;

export interface CreateUserDialogProps {
  onClose: () => void;
  prefill?: Prefill;
}

interface Issued { credential: IssuedCredential | null }

/** On success the one-time password or link replaces the form. */
export function CreateUserDialog({ onClose, prefill }: CreateUserDialogProps) {
  const queryClient = useQueryClient();
  const formId = useId();
  const options = useQuery(roleOptionsQuery);
  const [form, setForm] = useState<CreateForm>(() => initialCreateForm(prefill));
  const [errors, setErrors] = useState<FormErrors>({});
  // Only here: no query or storage ever holds the credential.
  const [issued, setIssued] = useState<Issued | null>(null);
  const create = useMutation({
    mutationFn: createUser,
    gcTime: 0,
    onSuccess: async (result) => {
      setIssued({ credential: result.credential });
      await queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const found = createErrors(form);
    setErrors(found);
    if (Object.keys(found).length === 0) create.mutate(createBody(form));
  };

  if (issued) return <CredentialResult title={t.users.result.createdTitle} credential={issued.credential} onClose={onClose} />;
  return (
    <Dialog
      title={C.title}
      onClose={onClose}
      wide
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={create.isPending}>
            {create.isPending ? C.submitting : C.submit}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
        <CreateUserFields form={form} onChange={setForm} errors={errors} options={options.data ?? []} lockedLink={!!prefill?.linked} />
        {create.error && <FormAlert>{userErrorText(create.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}
