import type { ThreadView } from '@ab/shared';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useTreeBase } from '@/core/nav/tree-base';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { LazyList } from '@/core/ui/layout/LazyList';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { SearchField } from '@/core/ui/form/SearchField';
import { clockAt } from '../shared/format';
import { InboxHeaderActions } from './InboxHeaderActions';
import { FAB, NewChatSheet } from './NewChatSheet';
import { type ChatChoice, ChatListChips, listOf } from '../lists/ChatListChips';
import { useThreadMode } from '../thread/hooks/thread-mode';
import { threadsEmptyTitle } from './threads-empty';
import { useThreadRow } from './ThreadRow';
import { useThreadList } from './use-thread-list';
import { useClockCycle } from '@/core/lib/clock';

/**
 * «المحادثات» (R-MOB-02): every WhatsApp thread — a guardian's reschedule request or a teacher's
 * «هتأخر» is found here, not only through its push. Tap → the thread (reply, send a template).
 * A teacher (R-TCH-03) gets only her own threads from the API, without the lead tags. The admin and
 * sales (the same tabs) start a chat by number: «محادثة جديدة»; the lead / family tags stay in the admin
 * tree (as the web, where /sales/inbox shows none). Admin and sales filter by the academy's chat
 * lists «القوائم» (docs/22); a teacher gets no lists.
 * The top is compact as WhatsApp's (owner 2026-10-27, «This topbar takes alot of space»): a one-line
 * h2 title with its icon actions, a pill search, ONE chip row (All · Unread · lists · ＋), 8pt apart.
 */
const keyOf = (th: ThreadView) => th.phone_e164;

export function ThreadsList({ switcher }: { switcher?: ReactNode }) {
  const cycle = useClockCycle();
  const mode = useThreadMode();
  const base = useTreeBase();
  const [search, setSearch] = useState('');
  const [choice, setChoice] = useState<ChatChoice>('all');
  const listId = listOf(choice);
  const filter = choice === 'unread' ? 'unread' : 'all';
  const list = useThreadList({ search, unread: filter === 'unread', list: listId ?? undefined, live: true });
  const loaded = list.data !== undefined;
  const stale = list.isError && loaded;
  const subtitle = stale ? t.mobile.lastUpdated.replace('{time}', clockAt(list.dataUpdatedAt, cycle)) : undefined;
  const admin = mode.kind === 'admin';
  const renderItem = useThreadRow(mode, base);

  return (
    <View testID="chats-list" style={{ flex: 1, gap: 8 }}>
      <ScreenHeader
        title={t.nav.chats}
        size="h2"
        connecting
        subtitle={subtitle}
        trailing={admin ? <InboxHeaderActions base={base} /> : undefined}
      />
      {switcher}
      <SearchField compact onSearch={setSearch} label={t.inbox.searchPlaceholder} />
      <ChatListChips value={choice} onChange={setChoice} lists={admin} />
      <LazyList
        paged={list}
        keyExtractor={keyOf}
        renderItem={renderItem}
        endSpace={admin ? FAB + 16 : 0}
        ListEmptyComponent={
          list.isPending ? null : loaded ? (
            <EmptyState title={threadsEmptyTitle({ listId, filter, search })} />
          ) : (
            <ErrorState onRetry={list.refresh} />
          )
        }
      />
      {admin ? <NewChatSheet /> : null}
    </View>
  );
}
