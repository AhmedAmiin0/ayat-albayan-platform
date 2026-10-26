import type { UserDetail } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { enableUser, signOutUser, USERS_KEY } from '../shared/api';
import { userErrorText } from '../shared/errors';

export type ActionMode = 'disable' | 'reset' | 'delete';

export interface UserActionsProps {
  user: UserDetail;
  onMode: (mode: ActionMode) => void;
  onDone: (message: string) => void;
}

/**
 * The account actions (users.write), as on the web: disable / enable, reset password, sign out
 * everywhere, delete. Enable and sign-out run after an inline «تأكيد»; the others open their step.
 */
export function UserActions({ user, onMode, onDone }: UserActionsProps) {
  const A = t.users.actions;
  const { color } = useTheme();
  const queryClient = useQueryClient();
  const [asking, setAsking] = useState<'enable' | 'signOut' | null>(null);
  const enable = useMutation({
    mutationFn: enableUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: USERS_KEY });
      onDone(t.users.toast.enabled);
    },
  });
  const signOut = useMutation({ mutationFn: signOutUser, onSuccess: () => onDone(t.users.toast.signedOut) });
  const failed = enable.error ?? signOut.error;
  const confirm = () => (asking === 'enable' ? enable.mutate(user.id) : signOut.mutate(user.id));
  const question = asking === 'enable' ? t.mobileUsers.enableConfirm : t.mobileUsers.signOutConfirm;
  return (
    <View style={{ gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: color.rule }}>
      {user.status === 'active' ? (
        <Button variant="secondary" label={A.disable} onPress={() => onMode('disable')} />
      ) : (
        <Button variant="secondary" label={A.enable} onPress={() => setAsking('enable')} />
      )}
      <Button variant="secondary" label={A.resetPassword} onPress={() => onMode('reset')} />
      <Button variant="secondary" label={A.signOut} onPress={() => setAsking('signOut')} />
      <Button variant="ghost" label={A.delete} onPress={() => onMode('delete')} />
      {asking ? (
        <InlineConfirm
          message={question.replace('{name}', user.full_name)}
          busy={enable.isPending || signOut.isPending}
          onConfirm={confirm}
          onCancel={() => setAsking(null)}
        />
      ) : null}
      <Note>{A.signOutHint}</Note>
      {failed ? <ErrorLine message={userErrorText(failed)} /> : null}
    </View>
  );
}
