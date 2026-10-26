import type { ChatList } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { listErrorText } from './list-errors';
import { ListNameForm } from './ListNameForm';
import { ListSheet } from './ListSheet';
import { useCreateList } from './use-chat-lists';

interface CreateListSheetProps {
  open: boolean;
  onClose: () => void;
  /** The new list: the chip row makes it the active one. */
  onCreated: (list: ChatList) => void;
}

/** «قائمة جديدة»: the name, «إنشاء»; a taken name or the 30-list limit shows under the field. */
export function CreateListSheet({ open, onClose, onCreated }: CreateListSheetProps) {
  const create = useCreateList();
  const close = () => {
    create.reset();
    onClose();
  };
  const submit = (name: string) =>
    create.mutate(name, {
      onSuccess: (list) => {
        onCreated(list);
        close();
      },
    });
  return (
    <ListSheet open={open} title={t.inbox.lists.new} onClose={close}>
      {open ? (
        <ListNameForm
          submitLabel={t.inbox.lists.create}
          onSubmit={submit}
          busy={create.isPending}
          error={create.isError ? listErrorText(create.error) : null}
        />
      ) : null}
    </ListSheet>
  );
}
