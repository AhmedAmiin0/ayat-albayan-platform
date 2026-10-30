import type { ChatList } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { createList, listErrorText, refreshLists } from '../lib/api';
import { ListNameForm } from './ListNameForm';

export interface CreateListDialogProps {
  onClose: () => void;
  /** The new list (the chip row shows it; the thread checklist adds the chat to it). */
  onCreated: (list: ChatList) => void;
}

/** «قائمة جديدة» (docs/22 §4): the name and «إنشاء»; a taken name or the 30-list cap shows inline. */
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
      <ListNameForm id={formId} error={create.isError ? listErrorText(create.error) : null} onSubmit={(name) => create.mutate(name)} />
    </Dialog>
  );
}
