import { ConfirmSwitchDialog } from '@/components/settings/dialogs/ConfirmSwitchDialog';
import { t } from '@/lib/i18n/i18n';

interface Props {
  /** The admin's moderation: the body says so. */
  moderator: boolean;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const a = t.studentChannel.actions;

/** «حذف الرسالة للجميع؟»: it goes for every participant and cannot be undone. */
export function ChannelDeleteDialog({ moderator, pending, onConfirm, onClose }: Props) {
  return (
    <ConfirmSwitchDialog
      title={a.deleteTitle}
      description={moderator ? a.moderateBody : a.deleteBody}
      yes={a.deleteConfirm}
      onYes={onConfirm}
      onClose={onClose}
      pending={pending}
      failed={false}
    />
  );
}
