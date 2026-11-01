import type { UserDetail } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Section } from '@/core/ui/surface/Section';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { deleteUser, disableUser, USERS_KEY } from '@/users/shared/api';
import { historyReferences, userErrorText } from '@/users/shared/errors';
import { HistoryReferences } from './HistoryReferences';
import { backToUsers } from '@/users/shared/nav';
import { PanelButtons } from './PanelButtons';

interface DeletePanelProps {
  user: UserDetail;
  onBack: () => void;
  onDone: (message: string) => void;
}

/**
 * Confirms the delete. The API decides (as on the web): a user with history answers 409, and the
 * panel lists the tables and offers «تعطيل بدلًا من الحذف» instead of the delete.
 */
export function DeletePanel({ user, onBack, onDone }: DeletePanelProps) {
  const D = t.users.delete;
  const { color } = useTheme();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: deleteUser,
    // Leave first: refetching the open detail of a deleted user would 404.
    onSuccess: () => {
      backToUsers();
      queryClient.removeQueries({ queryKey: [...USERS_KEY, 'detail', user.id] });
      void queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
  const disable = useMutation({
    mutationFn: disableUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: USERS_KEY });
      onDone(t.users.toast.disabled);
    },
  });
  const references = historyReferences(remove.error);
  const failed = disable.error ?? (references ? null : remove.error);
  return (
    <Section title={D.title}>
      {references ? (
        <HistoryReferences references={references} />
      ) : (
        <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.sm, color: color.ink }}>
          {D.body.replace('{name}', user.full_name)}
        </AppText>
      )}
      {failed ? <ErrorLine message={userErrorText(failed)} /> : null}
      {references ? (
        <PanelButtons
          confirmLabel={D.disableInstead}
          busy={disable.isPending}
          disabled={user.status === 'disabled'}
          onConfirm={() => disable.mutate({ id: user.id })}
          onCancel={onBack}
        />
      ) : (
        <PanelButtons confirmLabel={D.confirm} busy={remove.isPending} onConfirm={() => remove.mutate(user.id)} onCancel={onBack} />
      )}
    </Section>
  );
}
