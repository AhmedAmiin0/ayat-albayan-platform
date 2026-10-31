import type { ThreadView } from '@ab/shared';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useTreeBase } from '@/core/nav/tree-base';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { LazyList } from '@/core/ui/lists/LazyList';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { SearchField } from '@/core/ui/form/SearchField';
import { clockAt } from '@/inbox/shared/format';
import { InboxHeaderActions } from './InboxHeaderActions';
import { FAB, NewChatSheet } from './NewChatSheet';
import { type ChatChoice, ChatListChips } from '@/inbox/lists/ChatListChips';
import { useThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { choiceQuery, threadsEmptyTitle } from './chat-filter';
import { LeadChips } from './LeadChips';
import { useThreadRow } from './ThreadRow';
import { useChoiceRows, useThreadList } from './use-thread-list';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { useToday } from '@/core/lib/time/use-today';

/**
 * «المحادثات» (R-MOB-02): every WhatsApp thread — a guardian's reschedule request or a teacher's
 * «هتأخر» is found here, not only through its push. Tap → the thread (reply, send a template).
 * A teacher (R-TCH-03) gets only her own threads from the API, without the lead tags. The admin and
 * sales (the same tabs) start a chat by number: «محادثة جديدة». Both trees show the lead / family tags
 * (sales without «غير مدفوع», review 2026-10-29 #2) and filter by «بانتظار ردّك», the lead stage and
 * the academy's chat lists «القوائم» (docs/22); a teacher gets none of them.
 * The top is compact as WhatsApp's (owner 2026-10-27, «This topbar takes alot of space»): a one-line
 * h2 title with its icon actions, a pill search, ONE chip row (All · Unread · Waiting · stages · lists · ＋), 8pt apart.
 */
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
  const loaded = list.data !== undefined;
  const stale = list.isError && loaded;
  const subtitle = stale ? t.mobile.lastUpdated.replace('{time}', clockAt(list.dataUpdatedAt, cycle, tz)) : undefined;
  const admin = mode.kind === 'admin';
  // One clock for the whole list (not a timer per row), new only at midnight.
  const renderItem = useThreadRow(mode, base, useToday());

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
        ListEmptyComponent={
          list.isPending || seeking ? null : loaded ? (
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
