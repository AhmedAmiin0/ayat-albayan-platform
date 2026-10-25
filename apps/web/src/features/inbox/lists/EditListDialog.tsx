import type { ChatList } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/lib/i18n';
import { listErrorText, refreshLists, renameList } from './api';
import { AutoListNote } from './AutoListNote';
import { DeleteListDialog } from './DeleteListDialog';
import { ListNameForm } from './ListNameForm';

const L = t.inbox.lists;

export interface EditListDialogProps {
  list: ChatList;
  onClose: () => void;
  /** The list is gone: the chip row goes back to «الكل». */
  onDeleted: () => void;
}

/**
 * «تعديل القائمة» (docs/22 §4): rename («حفظ») or «حذف القائمة», which asks first and says the chats
 * themselves stay (DeleteListDialog).
 */
export function EditListDialog({ list, onClose, onDeleted }: EditListDialogProps) {
  const formId = useId();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const rename = useMutation({
    mutationFn: renameList,
    onSuccess: async () => {
      await refreshLists(queryClient);
      onClose();
    },
  });
  if (confirming) return <DeleteListDialog list={list} onClose={() => setConfirming(false)} onDeleted={onDeleted} />;
  const actions = (
    <>
      <Button type="button" variant="danger-quiet" className="sm:me-auto" onClick={() => setConfirming(true)}>
        {L.delete}
      </Button>
      <Button type="button" variant="ghost" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button type="submit" form={formId} disabled={rename.isPending}>
        {L.save}
      </Button>
    </>
  );
  return (
    <Dialog layout="center" title={L.edit} description={list.name} onClose={onClose} actions={actions}>
      {list.auto_rule && <AutoListNote rule={list.auto_rule} className="mb-3" />}
      <ListNameForm
        id={formId}
        initial={list.name}
        error={rename.isError ? listErrorText(rename.error) : null}
        onSubmit={(name) => rename.mutate({ id: list.id, name })}
      />
    </Dialog>
  );
}
