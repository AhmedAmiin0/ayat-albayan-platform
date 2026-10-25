import { useQuery } from '@tanstack/react-query';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n';
import { roleOptionsQuery, userQuery } from './api';
import { UserEditor } from './UserEditor';

export interface UserDetailDialogProps {
  userId: string;
  canWrite: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Loads the user and the role options, then hands over to the editor. */
export function UserDetailDialog({ userId, canWrite, onClose, onDone }: UserDetailDialogProps) {
  const user = useQuery(userQuery(userId));
  const options = useQuery(roleOptionsQuery);
  if (user.data && !options.isPending) {
    return <UserEditor key={user.data.id} user={user.data} options={options.data ?? []} canWrite={canWrite} onClose={onClose} onDone={onDone} />;
  }
  return (
    <Dialog title={t.users.detail.title} onClose={onClose}>
      {user.isError ? <FormAlert>{t.common.error}</FormAlert> : <p className="text-sm text-ink-3">{t.common.loading}</p>}
    </Dialog>
  );
}
