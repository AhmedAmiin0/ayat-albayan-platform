import type { IssuedCredential } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { createUser, roleOptionsQuery, USERS_KEY } from '../shared/api';
import { initialCreateForm, type CreateForm, type Prefill } from './create-form';
import { CreateUserFields } from './CreateUserFields';
import { CredentialResult } from './CredentialResult';
import { userErrorText } from '../shared/errors';
import { PanelButtons } from '../panels/PanelButtons';
import { createBody, createErrors, type FormErrors } from '../shared/validation';

export interface CreateUserFormProps {
  onClose: () => void;
  /** Start with a role and a record already picked (the student file's «إنشاء حساب»). */
  prefill?: Prefill;
}

type Issued = { credential: IssuedCredential | null };

/** «مستخدم جديد» (users.write): on success the one-time password / link replaces the form. */
export function CreateUserForm({ onClose, prefill }: CreateUserFormProps) {
  const C = t.users.create;
  const queryClient = useQueryClient();
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
  const submit = () => {
    const found = createErrors(form);
    setErrors(found);
    if (Object.keys(found).length === 0) create.mutate(createBody(form));
  };
  if (issued) return <CredentialResult title={t.users.result.createdTitle} credential={issued.credential} onClose={onClose} />;
  return (
    <View style={{ gap: 16 }}>
      <CreateUserFields form={form} onChange={setForm} errors={errors} options={options.data ?? []} lockedLink={prefill?.linked !== undefined} />
      {create.error ? <ErrorLine message={userErrorText(create.error)} /> : null}
      <PanelButtons confirmLabel={create.isPending ? C.submitting : C.submit} busy={create.isPending} onConfirm={submit} onCancel={onClose} />
    </View>
  );
}
