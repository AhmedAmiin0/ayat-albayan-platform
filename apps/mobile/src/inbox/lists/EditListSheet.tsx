import type { ChatList } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { ErrorLine } from '../ErrorLine';
import { AutoListNote } from './AutoListNote';
import { listErrorText } from './list-errors';
import { ListNameForm } from './ListNameForm';
import { ListSheet } from './ListSheet';
import { useDeleteList, useRenameList } from './use-chat-lists';

interface EditListSheetProps {
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
      {list.auto_rule ? <AutoListNote rule={list.auto_rule} /> : null}
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
          message={[confirm, t.inbox.lists.deleteNote, list.auto_rule ? t.inbox.lists.autoDeleteNote : ''].filter(Boolean).join(' ')}
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
