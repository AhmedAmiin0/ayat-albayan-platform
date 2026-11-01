import type { ChatList, LeadStatus } from '@ab/shared';
import { type ReactNode, useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useHolds } from '@/auth/use-permissions';
import { Note } from '@/core/ui/feedback/Note';
import { t } from '@/core/lib/i18n/i18n';
import { AutoListNote } from './AutoListNote';
import { CreateListSheet } from './CreateListSheet';
import { EditListSheet } from './EditListSheet';
import { ListChip } from './ListChip';
import { listsOf, useChatLists } from '@/inbox/lists/lib/use-chat-lists';

/**
 * The row's one choice (single, as WhatsApp): every chat, the unread ones, those waiting for her reply,
 * one lead stage, or one list by id.
 */
export type ChatChoice = 'all' | 'unread' | 'waiting' | { stage: LeadStatus } | { list: string };

/** The active list's id, or null for every other choice. */
const listOf = (choice: ChatChoice): string | null =>
  typeof choice === 'object' && 'list' in choice ? choice.list : null;

export interface ChatListChipsProps {
  value: ChatChoice;
  onChange: (choice: ChatChoice) => void;
  /** The academy's lists in the row (admin and sales); a teacher's row is «الكل» · «غير مقروءة» only. */
  lists?: boolean;
  /** More choices after the lists, before «＋» (staff: «بانتظار ردّك» and the lead stages, threads-list/LeadChips). */
  children?: ReactNode;
}

/**
 * The row's lists: only for a holder of inbox.lists where the caller wants them. An active list
 * that is gone (deleted, or the lists are off) falls back to «الكل».
 */
function useRowLists({ wanted, value, onChange }: Omit<ChatListChipsProps, 'lists' | 'children'> & { wanted: boolean }) {
  const allowed = useHolds('inbox.lists') && wanted;
  const query = useChatLists(allowed);
  const lists = allowed ? listsOf(query.data) : [];
  const listId = listOf(value);
  const gone = listId !== null && (!allowed || (query.isSuccess && !lists.some((l) => l.id === listId)));
  useEffect(() => {
    if (gone) onChange('all');
  }, [gone, onChange]);
  return { allowed, query, lists, listId, gone };
}

interface ListExtrasProps {
  active: ChatList | undefined;
  loadError: boolean;
  creating: boolean;
  editing: ChatList | null;
  onCreated: (list: ChatList) => void;
  onClose: () => void;
}

/** Under the row, for a lists holder only: the auto list's note, the quiet load error, the two sheets. */
function ListExtras({ active, loadError, creating, editing, onCreated, onClose }: ListExtrasProps) {
  return (
    <>
      {active?.auto_rule ? <AutoListNote rule={active.auto_rule} /> : null}
      {loadError ? <Note>{t.inbox.lists.loadError}</Note> : null}
      <CreateListSheet open={creating} onClose={onClose} onCreated={onCreated} />
      <EditListSheet list={editing} onClose={onClose} />
    </>
  );
}

/**
 * The chats' ONE chip row (docs/22 §5, owner 2026-10-27, like WhatsApp: All · Unread · lists · +):
 * «الكل», «غير مقروءة», the academy's lists oldest first (her own lists stay in reach), the caller's
 * extra choices, then «＋» (a new list). It scrolls sideways
 * (RTL order). The lists only for a holder of inbox.lists outside teacher mode. An active list that
 * is gone (deleted here or by another assistant) falls back to «الكل». Loading or failing stays
 * quiet: the chats never wait for the lists.
 */
export function ChatListChips({ value, onChange, lists: wanted = false, children }: ChatListChipsProps) {
  const { allowed, query, lists, listId, gone } = useRowLists({ wanted, value, onChange });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ChatList | null>(null);
  const close = () => {
    setCreating(false);
    setEditing(null);
  };
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        accessibilityLabel={t.inbox.filterRow}
        style={{ flexGrow: 0, flexShrink: 0 }}
        // 6 + 32 + 6: the row is 44pt, so each chip's 6pt hitSlop stays inside it (a ScrollView clips touches).
        contentContainerStyle={{ gap: 8, paddingVertical: 6 }}
      >
        <ListChip label={t.inbox.filterAll} selected={value === 'all' || gone} onPress={() => onChange('all')} />
        <ListChip label={t.inbox.filterUnread} selected={value === 'unread'} onPress={() => onChange('unread')} />
        {lists.map((list) => (
          <ListChip
            key={list.id}
            label={list.name}
            selected={list.id === listId}
            onPress={() => onChange({ list: list.id })}
            onEdit={() => setEditing(list)}
          />
        ))}
        {children}
        {allowed ? <ListChip action label="＋" name={t.inbox.lists.new} onPress={() => setCreating(true)} /> : null}
      </ScrollView>
      {allowed ? (
        <ListExtras
          active={lists.find((l) => l.id === listId)}
          loadError={query.isError && !query.data}
          creating={creating}
          editing={editing}
          onCreated={(list) => onChange({ list: list.id })}
          onClose={close}
        />
      ) : null}
    </>
  );
}
