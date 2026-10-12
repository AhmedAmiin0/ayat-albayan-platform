import { counted, formatPhone, messageStatusStyle, type ThreadView } from '@ab/shared';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { inTree, useTreeBase } from '@/nav/tree-base';
import { Avatar } from '@/ui/Avatar';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { FilterPills, type FilterPill } from '@/ui/FilterPills';
import { ListRow } from '@/ui/ListRow';
import { ltr } from '@/ui/Ltr';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { SearchField } from '@/ui/SearchField';
import { StatusChip } from '@/ui/StatusChip';
import { clockAt, initialOf, kindLabel } from './format';
import { threadPreview } from './message-text';
import { NewChatSheet } from './NewChatSheet';
import { threadLink, useThreadMode } from './thread-mode';
import { ThreadTags } from './ThreadTags';
import { useThreadList } from './use-thread-list';

type Filter = 'all' | 'unread';
const filterPills = (): FilterPill<Filter>[] => [
  { value: 'all', label: t.inbox.filterAll },
  { value: 'unread', label: t.inbox.filterUnread },
];

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
 * «المحادثات» (R-MOB-02): every WhatsApp thread — a guardian's reschedule request or a teacher's
 * «هتأخر» is found here, not only through its push. Tap → the thread (reply, send a template).
 * A teacher (R-TCH-03) gets only her own threads from the API, without the lead tags. The admin and
 * sales (the same tabs) start a chat by number: «محادثة جديدة»; the lead / family tags stay in the admin
 * tree (as the web, where /sales/inbox shows none).
 */
export function ThreadsList({ switcher }: { switcher?: ReactNode }) {
  const mode = useThreadMode();
  const base = useTreeBase();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const list = useThreadList({ search, unread: filter === 'unread' });
  const loaded = list.data !== undefined;
  const stale = list.isError && loaded;
  const subtitle = stale ? t.mobile.lastUpdated.replace('{time}', clockAt(list.dataUpdatedAt)) : undefined;

  return (
    <>
      <ScreenHeader title={t.nav.conversations} subtitle={subtitle} trailing={mode.kind === 'admin' ? <NewChatSheet /> : undefined} />
      {switcher}
      <SearchField onSearch={setSearch} label={t.inbox.searchPlaceholder} />
      <FilterPills items={filterPills()} value={filter} onChange={setFilter} accessibilityLabel={t.inbox.title} />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={list.items}
        keyExtractor={(th) => th.phone_e164}
        renderItem={({ item: th }) => {
          const phone = formatPhone(th.phone_e164);
          const teacher = mode.kind === 'teacher';
          return (
            <ListRow
              leading={<Avatar letter={initialOf(th.display_name)} />}
              title={th.display_name ?? (teacher ? kindLabel(th) : ltr(phone))}
              meta={th.display_name && !teacher ? phone : undefined}
              subtitle={threadPreview(th)}
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
            <EmptyState title={filter === 'unread' ? t.inbox.emptyUnread : t.inbox.empty} />
          ) : (
            <ErrorState onRetry={list.refresh} />
          )
        }
      />
    </>
  );
}
