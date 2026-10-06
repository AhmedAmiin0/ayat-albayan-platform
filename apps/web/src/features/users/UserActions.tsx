import type { UserDetail } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { enableUser, signOutUser, USERS_KEY } from './api';
import { userErrorText } from './errors';

const A = t.users.actions;

export type ActionMode = 'disable' | 'reset' | 'delete';

export interface UserActionsProps {
  user: UserDetail;
  onMode: (mode: ActionMode) => void;
  onDone: (message: string) => void;
}

/** The account actions (users.write): disable / enable, reset password, sign out everywhere, delete. */
export function UserActions({ user, onMode, onDone }: UserActionsProps) {
  const queryClient = useQueryClient();
  const enable = useMutation({
    mutationFn: enableUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: USERS_KEY });
      onDone(t.users.toast.enabled);
    },
  });
  const signOut = useMutation({ mutationFn: signOutUser, onSuccess: () => onDone(t.users.toast.signedOut) });
  const failed = enable.error ?? signOut.error;
  return (
    <section className="grid gap-3 border-t border-rule pt-4">
      <div className="flex flex-wrap gap-2.5">
        {user.status === 'active' ? (
          <Button type="button" variant="secondary" onClick={() => onMode('disable')}>
            {A.disable}
          </Button>
        ) : (
          <Button type="button" variant="secondary" disabled={enable.isPending} onClick={() => enable.mutate(user.id)}>
            {A.enable}
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={() => onMode('reset')}>
          {A.resetPassword}
        </Button>
        <Button type="button" variant="secondary" disabled={signOut.isPending} onClick={() => signOut.mutate(user.id)}>
          {A.signOut}
        </Button>
        <Button type="button" variant="danger-quiet" onClick={() => onMode('delete')}>
          {A.delete}
        </Button>
      </div>
      <p className="text-xs text-pretty text-ink-3">{A.signOutHint}</p>
      {failed && <FormAlert>{userErrorText(failed)}</FormAlert>}
    </section>
  );
}
