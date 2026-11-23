import type { ThreadView } from '@ab/shared';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { t, EmptyState, ErrorState, ScreenHeader } from '@ab/mobile-kit';
import { useTreeBase } from '@/core/nav/tree-base';
import { LazyList } from '@/core/ui/lists/LazyList';
import { SearchField } from '@/core/ui/form/SearchField';
import { clockAt } from '@/inbox/shared/format';
import { InboxHeaderActions } from './InboxHeaderActions';
import { FAB, NewChatSheet } from './NewChatSheet';
import { type ChatChoice, ChatListChips } from '@/inbox/lists/components/ChatListChips';
import { useThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { choiceQuery, threadsEmptyTitle } from './chat-filter';
import { LeadChips } from './LeadChips';
import { useThreadRow } from './ThreadRow';
import { useSearchSections } from './message-hits';
import { useChoiceRows, useThreadList } from './use-thread-list';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { useToday } from '@/core/lib/time/use-today';

/** R-MOB-02, R-TCH-03: a teacher gets only her own threads and no filters; docs/22, docs/37. */
const keyOf = (th: ThreadView) => th.phone_e164;

export function ThreadsList({ switcher }: { switcher?: ReactNode }) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const mode = useThreadMode();
  const base = useTreeBase();
  const [search, setSearch] = useState('');
  const [choice, setChoice] = useState<ChatChoice>('all');
  const list = useThreadList({ search, ...choiceQuery(choice), live: true });
  const { rows, seeking } = useChoiceRows(list, choice === 'waiting');
  const today = useToday();
  const hits = useSearchSections({ q: search, mode, base, now: today, chats: rows.items.length });
  const quiet = list.isPending || seeking || hits.found;
  const loaded = list.data !== undefined;
  const stale = list.isError && loaded;
  const subtitle = stale ? t.mobile.lastUpdated.replace('{time}', clockAt(list.dataUpdatedAt, cycle, tz)) : undefined;
  const admin = mode.kind === 'admin';
  // One clock for the whole list (not a timer per row), new only at midnight.
  const renderItem = useThreadRow(mode, base, today);

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
      <ChatListChips value={choice} onChange={setChoice} lists={admin}>
        {admin ? <LeadChips value={choice} onChange={setChoice} /> : null}
      </ChatListChips>
      <LazyList
        paged={rows}
        keyExtractor={keyOf}
        renderItem={renderItem}
        endSpace={admin ? FAB + 16 : 0}
        ListHeaderComponent={hits.header}
        ListFooterComponent={hits.footer}
        ListEmptyComponent={
          quiet ? null : loaded ? (
            <EmptyState title={threadsEmptyTitle(choice, search)} />
          ) : (
            <ErrorState onRetry={list.refresh} />
          )
        }
      />
      {admin ? <NewChatSheet /> : null}
    </View>
  );
}
