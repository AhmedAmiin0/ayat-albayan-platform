import type { ChatListRef } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { listErrorText } from './list-errors';
import { ListCheckRow } from './ListCheckRow';
import { ListNameForm } from './ListNameForm';
import { ListSheet } from './ListSheet';
import { listsOf, useChatLists, useCreateList } from './use-chat-lists';
import { useListMembership } from './use-list-membership';

interface ThreadListsSheetProps {
  phone: string;
  /** The lists this chat is in (the thread detail's `lists`). */
  member: readonly ChatListRef[];
  open: boolean;
  onClose: () => void;
}

/**
 * A chat's «القوائم»: every list of the academy, checked when the chat is in it. A tap saves at
 * once (optimistic; a refusal unticks it again with «تعذر حفظ التغيير»). «قائمة جديدة» at the end
 * creates a list and puts this chat in it in one go. Nothing is sent to the family.
 */
export function ThreadListsSheet({ phone, member, open, onClose }: ThreadListsSheetProps) {
  const query = useChatLists(open);
  const lists = listsOf(query.data);
  const toggle = useListMembership(phone);
  const create = useCreateList();
  const [adding, setAdding] = useState(false);
  const close = () => {
    setAdding(false);
    create.reset();
    toggle.reset();
    onClose();
  };
  const ids = new Set(member.map((l) => l.id));
  const createAndAdd = (name: string) =>
    create.mutate(name, {
      onSuccess: (list) => {
        setAdding(false);
        toggle.mutate({ list: { id: list.id, name: list.name }, member: true });
      },
    });
  return (
    <ListSheet open={open} title={t.inbox.lists.chatLists} onClose={close}>
      {query.isPending ? <Note>{t.common.loading}</Note> : null}
      {query.isError && !query.data ? <ErrorLine message={t.inbox.lists.loadError} /> : null}
      {query.isSuccess && lists.length === 0 ? <Note>{t.inbox.lists.none}</Note> : null}
      {lists.map((list) => (
        <ListCheckRow
          key={list.id}
          list={list}
          checked={ids.has(list.id)}
          onToggle={() => toggle.mutate({ list: { id: list.id, name: list.name }, member: !ids.has(list.id) })}
        />
      ))}
      {toggle.isError ? <ErrorLine message={t.inbox.lists.saveError} /> : null}
      {adding ? (
        <ListNameForm
          submitLabel={t.inbox.lists.create}
          onSubmit={createAndAdd}
          busy={create.isPending}
          error={create.isError ? listErrorText(create.error) : null}
        />
      ) : (
        <Button variant="secondary" label={`＋ ${t.inbox.lists.new}`} onPress={() => setAdding(true)} />
      )}
    </ListSheet>
  );
}
