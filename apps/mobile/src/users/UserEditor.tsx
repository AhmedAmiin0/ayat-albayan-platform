import type { UserDetail, UserRoleOption } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/core/ui/primitives/Button';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { ActionPanel } from './ActionPanel';
import { updateUser, USERS_KEY } from './api';
import { editBody, editErrors, initialEditForm, type EditForm } from './edit-form';
import { userErrorText } from './errors';
import { backToUsers } from './nav';
import { UserActions, type ActionMode } from './UserActions';
import { UserEditFields } from './UserEditFields';
import { UserSummary } from './UserSummary';
import type { FormErrors } from './validation';

export interface UserEditorProps {
  user: UserDetail;
  options: readonly UserRoleOption[];
  canWrite: boolean;
}

/**
 * One user (the web's UserEditor): the summary and the fields, and with users.write «حفظ
 * التعديلات» and the account actions. An action that needs a step (disable, reset, delete) takes
 * the screen until it is done or cancelled; what it did is said at the top.
 */
export function UserEditor({ user, options, canWrite }: UserEditorProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EditForm>(() => initialEditForm(user, options));
  const [errors, setErrors] = useState<FormErrors>({});
  const [mode, setMode] = useState<ActionMode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const done = (message: string) => {
    setMode(null);
    setNotice(message);
  };
  const save = useMutation({
    mutationFn: updateUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: USERS_KEY });
      done(t.users.toast.saved);
    },
  });
  const submit = () => {
    setNotice(null);
    const found = editErrors(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const body = editBody(user, form, options);
    if (body) save.mutate({ id: user.id, body });
    else backToUsers();
  };
  return (
    <Screen>
      <ScrollView
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <ScreenHeader
          title={t.users.detail.title}
          subtitle={user.full_name}
          trailing={<Button variant="ghost" label={t.common.back} onPress={backToUsers} />}
        />
        {mode ? (
          <ActionPanel mode={mode} user={user} onBack={() => setMode(null)} onDone={done} />
        ) : (
          <>
            {notice ? <Note>{notice}</Note> : null}
            <UserSummary user={user} />
            <UserEditFields
              form={form}
              onChange={setForm}
              errors={errors}
              options={options}
              readOnly={!canWrite}
              roleLocked={user.linked !== null}
            />
            {save.error ? <ErrorLine message={userErrorText(save.error)} /> : null}
            {canWrite ? (
              <Button label={t.users.detail.save} busy={save.isPending} onPress={submit} />
            ) : (
              <Note>{t.users.detail.readOnly}</Note>
            )}
            {canWrite ? <UserActions user={user} onMode={setMode} onDone={done} /> : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
