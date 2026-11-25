import type { SavedReply } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Dialog, FormAlert, t } from '@ab/web-kit';
import { deleteReply, refreshReplies, replyErrorText } from '@/features/messaging/inbox/saved-replies/lib/api';

const S = t.savedReplies;

export interface DeleteReplyDialogProps {
  reply: SavedReply;
  onClose: () => void;
}

/** Deleting removes the reply and its file; messages already sent stay as they are. */
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
