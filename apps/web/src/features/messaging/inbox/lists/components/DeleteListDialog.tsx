import type { ChatList } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { deleteList, listErrorText, refreshLists } from '@/features/messaging/inbox/lists/lib/api';

const L = t.inbox.lists;

export interface DeleteListDialogProps {
  list: ChatList;
  onClose: () => void;
  onDeleted: () => void;
}

/** «حذف القائمة» confirm: only the list and its memberships go; never a chat, message, lead or family. */
export function DeleteListDialog({ list, onClose, onDeleted }: DeleteListDialogProps) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: deleteList,
    onSuccess: async () => {
      onDeleted();
      await refreshLists(queryClient);
    },
  });
  const actions = (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button type="button" variant="danger" disabled={remove.isPending} onClick={() => remove.mutate(list.id)}>
        {L.deleteYes}
      </Button>
    </>
  );
  return (
    <Dialog compact title={L.delete} onClose={onClose} actions={actions}>
      <div className="grid gap-3">
        <p className="text-body">{L.deleteConfirm.replace('{name}', list.name)}</p>
        <p className="text-sm text-ink-2">{L.deleteNote}</p>
        {list.auto_rule && <p className="text-sm text-ink-2">{L.autoDeleteNote}</p>}
        {remove.isError && <FormAlert>{listErrorText(remove.error)}</FormAlert>}
      </div>
    </Dialog>
  );
}
