import { counted, formatPhone, messageStatusStyle, type ThreadView } from '@ab/shared';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { FlatList, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { ListRow } from '@/core/ui/layout/ListRow';
import { ltr } from '@/core/ui/primitives/Ltr';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { SearchField } from '@/core/ui/form/SearchField';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { clockAt, initialOf, kindLabel } from '../shared/format';
import { DeliveryTicks } from '../messages/components/DeliveryTicks';
import { InboxHeaderActions } from './InboxHeaderActions';
import { type ChatChoice, ChatListChips, listOf } from '../lists/ChatListChips';
import { threadPreview } from '../messages/hooks/message-text';
import { threadLink, useThreadMode } from '../thread/hooks/thread-mode';
import { threadsEmptyTitle } from './threads-empty';
import { ThreadTags } from './ThreadTags';
import { useThreadList } from './use-thread-list';
import { useClockCycle } from '@/core/lib/clock';

/** Our last send failed (the admin's turn), else the unread count, else nothing (no empty slot). */
function turnChip(th: ThreadView): ReactNode {
  if (th.last_direction === 'outbound' && th.last_status === 'failed') {
    return <StatusChip {...messageStatusStyle.failed} label={t.enums.messageStatus.failed} size="sm" />;
  }
  if (th.unread_count > 0) {
    return <StatusChip tone="act" glyph="fill" label={counted(t.inbox.unread, th.unread_count)} size="sm" />;
  }
  return null;
}

/**
 * The row reads the ticks' status word before the preview (the ticks add no stop of their own);
 * failed is the row's «لم تُرسل» chip already.
 */
function ticksWord(th: ThreadView): string | undefined {
  if (th.last_direction !== 'outbound' || th.last_status === 'failed') return undefined;
  return `${t.enums.messageStatus[th.last_status]} · ${threadPreview(th)}`;
}

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
export function ThreadsList({ switcher }: { switcher?: ReactNode }) {
  const cycle = useClockCycle();
  const mode = useThreadMode();
  const base = useTreeBase();
  const [search, setSearch] = useState('');
  const [choice, setChoice] = useState<ChatChoice>('all');
  const listId = listOf(choice);
  const filter = choice === 'unread' ? 'unread' : 'all';
  const inset = useTabBarInset();
  const list = useThreadList({ search, unread: filter === 'unread', list: listId ?? undefined, live: true });
  const loaded = list.data !== undefined;
  const stale = list.isError && loaded;
  const subtitle = stale ? t.mobile.lastUpdated.replace('{time}', clockAt(list.dataUpdatedAt, cycle)) : undefined;

  return (
    <View testID="chats-list" style={{ flex: 1, gap: 8 }}>
      <ScreenHeader
        title={t.nav.chats}
        size="h2"
        connecting
        subtitle={subtitle}
        trailing={mode.kind === 'admin' ? <InboxHeaderActions base={base} /> : undefined}
      />
      {switcher}
      <SearchField compact onSearch={setSearch} label={t.inbox.searchPlaceholder} />
      <ChatListChips value={choice} onChange={setChoice} lists={mode.kind === 'admin'} />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ paddingBottom: 24 + inset }}
        data={list.items}
        keyExtractor={(th) => th.phone_e164}
        renderItem={({ item: th }) => {
          const phone = formatPhone(th.phone_e164);
          const teacher = mode.kind === 'teacher';
          const ours = th.last_direction === 'outbound';
          return (
            <ListRow
              leading={<Avatar letter={initialOf(th.display_name)} />}
              title={th.display_name ?? (teacher ? kindLabel(th) : ltr(phone))}
              meta={th.display_name && !teacher ? phone : undefined}
              subtitle={threadPreview(th)}
              subtitleLeading={ours ? <DeliveryTicks status={th.last_status} inList /> : undefined}
              subtitleLabel={ticksWord(th)}
              tags={mode.kind === 'admin' && !base ? <ThreadTags thread={th} /> : undefined}
              trailing={turnChip(th)}
              onPress={() => router.push(inTree(base, threadLink(th.phone_e164, mode)))}
            />
          );
        }}
        onEndReached={list.loadMore}
        refreshing={list.isRefetching}
        onRefresh={list.refresh}
        ListEmptyComponent={
          list.isPending ? null : loaded ? (
            <EmptyState title={threadsEmptyTitle({ listId, filter, search })} />
          ) : (
            <ErrorState onRetry={list.refresh} />
          )
        }
      />
    </View>
  );
}
