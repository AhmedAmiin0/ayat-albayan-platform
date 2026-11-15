import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import { chatListsQuery } from '@/features/messaging/inbox/lists/lib/api';
import { AutoListNote } from './AutoListNote';
import { ChatListChips } from './ChatListChips';
import { CreateListDialog } from './CreateListDialog';
import { EditListDialog } from './EditListDialog';

export interface ChatListsBarProps {
  /** The shown list (already checked against the lists: activeList). */
  active: string | undefined;
  onPick: (list: string | undefined) => void;
}

/**
 * The «القوائم» row above the conversations (docs/22 §4) with its create and edit dialogs. Quiet while
 * loading (a chip-high placeholder) and on error (one line): the chats below never wait for it.
 * Rendered only with inbox.lists outside teacher mode (InboxPage).
 */
export function ChatListsBar({ active, onPick }: ChatListsBarProps) {
  const lists = useQuery(chatListsQuery);
  const [dialog, setDialog] = useState<'new' | 'edit' | null>(null);
  if (lists.isPending) {
    return <div data-testid="chat-lists-loading" aria-hidden="true" className="mb-3 h-8 w-2/3 animate-pulse rounded-full bg-sunk max-sm:h-11" />;
  }
  if (lists.isError) {
    return (
      <p role="status" className="mb-3 text-xs text-danger">
        {t.inbox.lists.loadError}
      </p>
    );
  }
  const current = lists.data.find((l) => l.id === active);
  const close = () => setDialog(null);
  return (
    <>
      <ChatListChips lists={lists.data} active={active} onPick={onPick} onNew={() => setDialog('new')} onEdit={() => setDialog('edit')} />
      {current?.auto_rule && <AutoListNote rule={current.auto_rule} className="-mt-1.5 mb-3 px-1" />}
      {dialog === 'new' && (
        <CreateListDialog
          onClose={close}
          onCreated={(list) => {
            close();
            onPick(list.id);
          }}
        />
      )}
      {dialog === 'edit' && current && (
        <EditListDialog
          list={current}
          onClose={close}
          onDeleted={() => {
            close();
            onPick(undefined);
          }}
        />
      )}
    </>
  );
}
