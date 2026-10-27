import { CHANNEL_WRITES, threadMessages } from '@ab/client-core';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { KeyboardFrame } from '@/core/ui/layout/KeyboardFrame';
import { Note } from '@/more';
import { Button } from '@/core/ui/primitives/Button';
import { useTheme } from '@/theme';
import { ChannelBubble } from './ChannelBubble';
import { ChannelComposer } from './ChannelComposer';
import { useChannel, useMarkRead, useSendChannel, type ChannelRef } from './channel-queries';

/** The viewer's clock (the phone's zone). */
const phoneTz = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/**
 * One student's channel (docs/31 §2): an inverted list, so it opens on the newest message and a new one
 * lands in view; «الرسائل الأقدم» at the top pages back; polled while shown. A participant writes and
 * marks read up to the newest message; a monitor gets «للاطلاع فقط» and no composer.
 */
export function ChannelThread({ refs }: { refs: ChannelRef }) {
  const { color } = useTheme();
  const query = useChannel(refs);
  const send = useSendChannel(refs);
  const writes = CHANNEL_WRITES[refs.audience] && query.data?.pages[0]?.read_only !== true;
  useMarkRead(refs, writes ? query.data?.pages[0]?.messages.at(-1)?.created_at : undefined);
  if (!query.data) {
    return query.isError ? (
      <ErrorState message={t.studentChannel.loadFailed} onRetry={() => void query.refetch()} />
    ) : (
      <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
    );
  }
  const tz = phoneTz();
  const newestFirst = threadMessages(query.data.pages).reverse();
  return (
    <KeyboardFrame style={{ flex: 1 }}>
      {!writes ? <Note>{t.studentChannel.readOnly}</Note> : null}
      {newestFirst.length === 0 ? (
        <View style={{ flex: 1 }}>
          <EmptyState title={t.studentChannel.empty} />
        </View>
      ) : (
        <FlatList
          inverted
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
          data={newestFirst}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <ChannelBubble message={item} tz={tz} />}
          ListFooterComponent={
            query.hasNextPage ? (
              <Button variant="ghost" label={t.studentChannel.older} busy={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} />
            ) : null
          }
        />
      )}
      {writes ? (
        <View style={{ paddingBottom: 8 }}>
          <ChannelComposer pending={send.isPending} failed={send.isError} onSend={(body) => send.mutateAsync(body)} />
        </View>
      ) : null}
    </KeyboardFrame>
  );
}
