import type { MessageView } from '@ab/shared';
import { useEffect, useRef } from 'react';
import { FlatList, Keyboard, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { messageGap } from './list-gap';
import { MessageBubble } from './MessageBubble';
import { threadMessages } from './thread-cache';
import type { useThread } from './use-thread';

type ThreadQuery = ReturnType<typeof useThread>;

/**
 * Oldest → newest; follows the newest message (first load, a send) but not older pages. When the
 * keyboard opens the newest stays in sight (the list shrinks under it on Android and iOS).
 */
export function MessageList({ phone, query }: { phone: string; query: ThreadQuery }) {
  const list = useRef<FlatList<MessageView>>(null);
  const newest = useRef<string | undefined>(undefined);
  const messages = threadMessages(query.data);
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () =>
      list.current?.scrollToEnd({ animated: true }),
    );
    return () => shown.remove();
  }, []);
  const followNewest = () => {
    const last = messages[messages.length - 1]?.id;
    if (last === newest.current) return;
    newest.current = last;
    list.current?.scrollToEnd({ animated: false });
  };
  const older = query.hasNextPage ? (
    <Button
      variant="ghost"
      label={t.inbox.loadOlder}
      busy={query.isFetchingNextPage}
      onPress={() => void query.fetchNextPage()}
    />
  ) : null;
  return (
    <FlatList
      ref={list}
      testID="message-list"
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingVertical: 4 }}
      data={messages}
      keyExtractor={(m) => m.id}
      renderItem={({ item, index }) => (
        <View
          testID={`message-row-${item.id}`}
          style={{ paddingTop: messageGap(messages[index - 1], item) }}
        >
          <MessageBubble message={item} phone={phone} />
        </View>
      )}
      onContentSizeChange={followNewest}
      maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={() => void query.refetch()}
      ListHeaderComponent={older}
      ListEmptyComponent={<EmptyState title={t.inbox.empty} />}
    />
  );
}
