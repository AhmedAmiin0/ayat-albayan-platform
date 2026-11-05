import type { ThreadView } from '@ab/shared';
import type { ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Note } from '@/core/ui/feedback/Note';
import { SearchField } from '@/core/ui/form/SearchField';
import { LazyList } from '@/core/ui/lists/LazyList';
import { useThreadList } from '@/inbox/threads-list/use-thread-list';

const keyOf = (th: ThreadView) => th.phone_e164;

interface ChatPickListProps {
  /** One chat's row (ForwardRow in the forward sheet and the share chooser). */
  renderItem: (info: { item: ThreadView }) => ReactElement;
  /** A chat never offered: the forwarded message's own chat, a teacher's own academy chat. */
  exclude: (thread: ThreadView) => boolean;
  /** What the rows read besides the thread (the picks), so a pick redraws them. */
  extraData?: unknown;
  /** A line between the search and the list (the forward's «المختار: 2 من 5»). */
  note?: ReactNode;
  testID?: string;
}

/**
 * Search (name / number, debounced: GET /threads?search=) over the newest chats first, with their
 * loading, empty and error states. The server's GET /threads scope already limits it per role.
 */
export function ChatPickList({ renderItem, exclude, extraData, note, testID = 'forward-list' }: ChatPickListProps) {
  const [search, setSearch] = useState('');
  const list = useThreadList({ search, unread: false });
  const chats = list.items.filter((th) => !exclude(th));
  const waiting = list.isPending ? <Note>{t.inbox.forward.loading}</Note> : <EmptyState title={t.inbox.forward.empty} />;
  return (
    <>
      <SearchField label={t.inbox.forward.search} onSearch={setSearch} />
      {note}
      <LazyList
        testID={testID}
        keyboardShouldPersistTaps="handled"
        tabBar={false}
        data={chats}
        keyExtractor={keyOf}
        renderItem={renderItem}
        extraData={extraData}
        onEndReached={list.loadMore}
        ListEmptyComponent={
          list.isError ? <ErrorState onRetry={list.refresh} /> : <View style={{ padding: 16 }}>{waiting}</View>
        }
      />
    </>
  );
}
