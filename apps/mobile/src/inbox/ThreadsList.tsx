import { counted, formatPhone, messageStatusStyle, type ThreadView } from '@ab/shared';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { Avatar } from '@/ui/Avatar';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { FilterPills, type FilterPill } from '@/ui/FilterPills';
import { ListRow } from '@/ui/ListRow';
import { ltr } from '@/ui/Ltr';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { SearchField } from '@/ui/SearchField';
import { StatusChip } from '@/ui/StatusChip';
import { clockAt, initialOf } from './format';
import { threadPreview } from './message-text';
import { threadHref } from './thread-cache';
import { useThreadList } from './use-thread-list';

type Filter = 'all' | 'unread';
const PILLS: FilterPill<Filter>[] = [
  { value: 'all', label: t.inbox.filterAll },
  { value: 'unread', label: t.inbox.filterUnread },
];

function kindOf(th: ThreadView): string {
  if (th.guardian_id) return t.inbox.kind.guardian;
  if (th.teacher_id) return t.inbox.kind.teacher;
  return th.lead_id ? t.inbox.kind.lead : t.inbox.unknownNumber;
}

/** Our last send failed (the admin's turn), else the unread count, else who the number is. */
function Trailing({ thread: th }: { thread: ThreadView }) {
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
 */
export function ThreadsList({ switcher }: { switcher: ReactNode }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const list = useThreadList({ search, unread: filter === 'unread' });
  const loaded = list.data !== undefined;
  const stale = list.isError && loaded;
  const subtitle = stale ? t.mobile.lastUpdated.replace('{time}', clockAt(list.dataUpdatedAt)) : undefined;

  return (
    <>
      <ScreenHeader title={t.nav.conversations} subtitle={subtitle} />
      {switcher}
      <SearchField onSearch={setSearch} label={t.inbox.searchPlaceholder} />
      <FilterPills items={PILLS} value={filter} onChange={setFilter} accessibilityLabel={t.inbox.title} />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={list.items}
        keyExtractor={(th) => th.phone_e164}
        renderItem={({ item: th }) => {
          const phone = formatPhone(th.phone_e164);
          return (
            <ListRow
              leading={<Avatar letter={initialOf(th.display_name)} />}
              title={th.display_name ?? ltr(phone)}
              meta={th.display_name ? phone : undefined}
              subtitle={`${kindOf(th)} · ${threadPreview(th)}`}
              trailing={<Trailing thread={th} />}
              onPress={() => router.push(threadHref(th.phone_e164))}
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
