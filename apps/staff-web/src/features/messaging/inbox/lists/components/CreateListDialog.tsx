import type { ChatList } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId } from 'react';
import { Button, Dialog, t } from '@ab/web-kit';
import { createList, listErrorText, refreshLists } from '@/features/messaging/inbox/lists/lib/api';
import { ListNameForm } from './ListNameForm';

export interface CreateListDialogProps {
  onClose: () => void;
  /** The new list (the chip row shows it; the thread checklist adds the chat to it). */
  onCreated: (list: ChatList) => void;
}

/** A taken name or the 30-list cap shows inline (docs/22 §4). */
export function CreateListDialog({ onClose, onCreated }: CreateListDialogProps) {
  const formId = useId();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: createList,
    onSuccess: async (list) => {
      await refreshLists(queryClient);
      onCreated(list);
    },
  });
  const actions = (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button type="submit" form={formId} disabled={create.isPending}>
        {t.inbox.lists.create}
      </Button>
    </>
  );
  return (
    <Dialog layout="center" title={t.inbox.lists.new} onClose={onClose} actions={actions}>
      <ListNameForm
        id={formId}
        error={create.isError ? listErrorText(create.error) : null}
        onSubmit={(name) => create.mutate(name)}
      />
    </Dialog>
  );
}
