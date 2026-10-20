import type { ChatList } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { InlineConfirm } from '@/ui/InlineConfirm';
import { ErrorLine } from '../ErrorLine';
import { listErrorText } from './list-errors';
import { ListNameForm } from './ListNameForm';
import { ListSheet } from './ListSheet';
import { useDeleteList, useRenameList } from './use-chat-lists';

export interface EditListSheetProps {
  /** The list being edited; null keeps the sheet closed. */
  list: ChatList | null;
  onClose: () => void;
}

/**
 * «تعديل القائمة» (a long-press on its chip): rename with «حفظ», or «حذف القائمة» behind a
 * confirmation that says the chats themselves stay. After a delete the row falls back to «الكل».
 */
export function EditListSheet({ list, onClose }: EditListSheetProps) {
  const rename = useRenameList();
  const remove = useDeleteList();
  const [confirming, setConfirming] = useState(false);
  const close = () => {
    rename.reset();
    remove.reset();
    setConfirming(false);
    onClose();
  };
  if (!list) return null;
  const save = (name: string) => rename.mutate({ id: list.id, name }, { onSuccess: close });
  const confirm = t.inbox.lists.deleteConfirm.replace('{name}', list.name);
  return (
    <ListSheet open title={t.inbox.lists.editNamed.replace('{name}', list.name)} onClose={close}>
      <ListNameForm
        key={list.id}
        initial={list.name}
        submitLabel={t.inbox.lists.save}
        onSubmit={save}
        busy={rename.isPending}
        error={rename.isError ? listErrorText(rename.error) : null}
      />
      {confirming ? (
        <InlineConfirm
          message={`${confirm} ${t.inbox.lists.deleteNote}`}
          confirmLabel={t.inbox.lists.deleteYes}
          onConfirm={() => remove.mutate(list.id, { onSuccess: close })}
          onCancel={() => setConfirming(false)}
          busy={remove.isPending}
        />
      ) : (
        <Button variant="secondary" label={t.inbox.lists.delete} onPress={() => setConfirming(true)} />
      )}
      {remove.isError ? <ErrorLine message={listErrorText(remove.error)} /> : null}
    </ListSheet>
  );
}
