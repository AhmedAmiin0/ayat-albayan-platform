import { formatPhone, type MessageView } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { ltr } from '@/ui/Ltr';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Composer } from './Composer';
import { clockAt, kindLabel } from './format';
import { MessageBubble } from './MessageBubble';
import { OwnThreadNote } from './OwnThreadNote';
import { SendRating } from './rating/SendRating';
import { SubscriptionPanel } from './subscription/SubscriptionPanel';
import { threadMessages } from './thread-cache';
import { isOwnThread, threadBase, useThreadMode } from './thread-mode';
import { useThread } from './use-thread';

type ThreadQuery = ReturnType<typeof useThread>;

/** Offline: when the saved thread was fetched. Else who the number is, then the number if named. */
function subtitleOf(phone: string, query: ThreadQuery, teacher: boolean): string {
  if (query.isError && query.data) {
    return t.mobile.lastUpdated.replace('{time}', clockAt(query.dataUpdatedAt));
  }
  const thread = query.data?.pages[0]?.thread;
  return thread?.display_name && !teacher ? `${kindLabel(thread)} · ${ltr(formatPhone(phone))}` : kindLabel(thread);
}

/** Oldest → newest; follows the newest message (first load, a send) but not older pages. */
function MessageList({ phone, query }: { phone: string; query: ThreadQuery }) {
  const list = useRef<FlatList<MessageView>>(null);
  const newest = useRef<string | undefined>(undefined);
  const messages = threadMessages(query.data);
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
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
      data={messages}
      keyExtractor={(m) => m.id}
      renderItem={({ item }) => <MessageBubble message={item} phone={phone} />}
      onContentSizeChange={followNewest}
      maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={() => void query.refetch()}
      ListHeaderComponent={older}
      ListEmptyComponent={<EmptyState title={t.inbox.empty} />}
    />
  );
}

/**
 * One WhatsApp conversation (R-MOB-02, R-MSG-05): GET /threads/:phone oldest → newest with each
 * of our rows' status word, «رسايل أقدم» to page back, pull to refresh, and the composer. Offline
 * it shows the saved thread and when it was fetched (R-MOB-03). Opened from a lead or a push.
 * Over the messages: whether the family is subscribed, and the button to subscribe (R-SUB-01).
 * A teacher (R-TCH-03) gets no subscription panel, and her own chat with the academy is read-only.
 */
export function ThreadScreen() {
  const { phone = '' } = useLocalSearchParams<{ phone: string }>();
  const mode = useThreadMode();
  const teacher = mode.kind === 'teacher';
  const query = useThread(phone);
  const thread = query.data?.pages[0]?.thread ?? null;
  const back = () => (router.canGoBack() ? router.back() : router.replace(threadBase(mode)));
  return (
    <Screen>
      <ScreenHeader
        title={thread?.display_name ?? (teacher ? kindLabel(thread) : ltr(formatPhone(phone)))}
        subtitle={subtitleOf(phone, query, teacher)}
        trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
      />
      {mode.kind === 'admin' ? <SubscriptionPanel data={query.data} phone={phone} /> : null}
      {mode.kind === 'admin' && thread?.guardian_id ? <SendRating thread={thread} /> : null}
      {query.data ? (
        <KeyboardAvoidingView
          style={{ flex: 1, gap: 8 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <MessageList phone={phone} query={query} />
          {isOwnThread(mode, thread) ? (
            <OwnThreadNote />
          ) : (
            <Composer phone={phone} thread={thread} lessons={query.data.pages[0]?.lessons ?? []} />
          )}
        </KeyboardAvoidingView>
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : null}
    </Screen>
  );
}
