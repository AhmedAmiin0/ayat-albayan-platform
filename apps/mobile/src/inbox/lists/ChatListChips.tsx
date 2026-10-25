import type { ChatList } from '@ab/shared';
import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useHolds } from '@/auth/use-permissions';
import { Note } from '@/more/Note';
import { t } from '@/lib/i18n';
import { AutoListNote } from './AutoListNote';
import { CreateListSheet } from './CreateListSheet';
import { EditListSheet } from './EditListSheet';
import { ListChip } from './ListChip';
import { listsOf, useChatLists } from './use-chat-lists';

export interface ChatListChipsProps {
  /** The active list's id; null = «الكل». */
  value: string | null;
  onChange: (id: string | null) => void;
}

/**
 * «القوائم» over the chats (docs/22 §5, like WhatsApp Business): «الكل», the academy's lists oldest
 * first, then «＋ قائمة جديدة». One row that scrolls sideways (RTL order). Only for a holder of
 * inbox.lists, never in teacher mode (the caller leaves it out). An active list that is gone (deleted
 * here or by another assistant) falls back to «الكل». Loading or failing stays quiet: the chats
 * never wait for the lists.
 */
export function ChatListChips({ value, onChange }: ChatListChipsProps) {
  const allowed = useHolds('inbox.lists');
  const query = useChatLists(allowed);
  const lists = listsOf(query.data);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ChatList | null>(null);
  const gone = value !== null && query.isSuccess && !lists.some((l) => l.id === value);
  useEffect(() => {
    if (gone) onChange(null);
  }, [gone, onChange]);
  if (!allowed) return null;
  const active = lists.find((l) => l.id === value);
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        accessibilityLabel={t.inbox.lists.rowLabel}
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
      >
        <ListChip label={t.inbox.lists.all} selected={value === null || gone} onPress={() => onChange(null)} />
        {lists.map((list) => (
          <ListChip
            key={list.id}
            label={list.name}
            selected={list.id === value}
            onPress={() => onChange(list.id)}
            onEdit={() => setEditing(list)}
          />
        ))}
        <ListChip action label={`＋ ${t.inbox.lists.new}`} onPress={() => setCreating(true)} />
      </ScrollView>
      {active?.auto_rule ? <AutoListNote rule={active.auto_rule} /> : null}
      {query.isError && !query.data ? <Note>{t.inbox.lists.loadError}</Note> : null}
      <CreateListSheet open={creating} onClose={() => setCreating(false)} onCreated={(list) => onChange(list.id)} />
      <EditListSheet list={editing} onClose={() => setEditing(null)} />
    </>
  );
}
