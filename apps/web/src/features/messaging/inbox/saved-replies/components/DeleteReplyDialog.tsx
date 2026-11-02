import type { SavedReply } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { deleteReply, refreshReplies, replyErrorText } from '@/features/messaging/inbox/saved-replies/lib/api';

const S = t.savedReplies;

export interface DeleteReplyDialogProps {
  reply: SavedReply;
  onClose: () => void;
}

/** «حذف الرد»: the reply and its file go; messages already sent stay as they are. */
export function DeleteReplyDialog({ reply, onClose }: DeleteReplyDialogProps) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => deleteReply(reply.id),
    onSuccess: async () => {
      await refreshReplies(queryClient);
      onClose();
    },
  });
  const actions = (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button type="button" variant="danger" disabled={remove.isPending} onClick={() => remove.mutate()}>
        {S.deleteYes}
      </Button>
    </>
  );
  return (
    <Dialog compact title={S.deleteTitle.replace('{title}', reply.title)} onClose={onClose} actions={actions}>
      <div className="grid gap-3">
        <p className="text-body">{S.deleteConfirm}</p>
        {remove.isError && <FormAlert>{replyErrorText(remove.error)}</FormAlert>}
      </div>
    </Dialog>
  );
}
