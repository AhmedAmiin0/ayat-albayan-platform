import { channelBubbleActions, channelMode, liveChannelId, threadMessages } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import { useState } from 'react';
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
import { useChannelLive } from './use-channel-live';
import { ChannelMessageMenu } from '@/student-file/channel/edits/ChannelMessageMenu';

/** «للاطلاع فقط», and for a monitor of a closed channel why nobody writes yet. */
const readOnlyText = (open: boolean | undefined) =>
  open === false ? `${t.studentChannel.readOnly} ${t.studentChannel.closedMonitor}` : t.studentChannel.readOnly;

/** The viewer's clock (the phone's zone). */
const phoneTz = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/**
 * One student's channel (docs/31 §2): an inverted list, so it opens on the newest message and a new one
 * lands in view; «الرسائل الأقدم» at the top pages back; live over the socket, polled as the fallback. A
 * participant writes and marks read up to the newest message; before the subscription and the teacher's
 * assignment (owner 2026-10-29) only the closed line. A monitor gets «للاطلاع فقط» and no composer.
 */
export function ChannelThread({ refs }: { refs: ChannelRef }) {
  const { color } = useTheme();
  const [live, setLive] = useState(false);
  // «تعديل» / «حذف للجميع» (owner 2026-10-30): the long-pressed message's menu.
  const [held, setHeld] = useState<ChannelMessageView | null>(null);
  const query = useChannel(refs, live);
  const send = useSendChannel(refs);
  const first = query.data?.pages[0];
  const mode = channelMode(refs.audience, first);
  const writes = mode === 'write';
  useChannelLive(refs, { channelId: liveChannelId(mode, first), onLive: setLive });
  useMarkRead(refs, writes ? first?.messages.at(-1)?.created_at : undefined);
  if (!query.data) {
    return query.isError ? (
      <ErrorState message={t.studentChannel.loadFailed} onRetry={() => void query.refetch()} />
    ) : (
      <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
    );
  }
  if (mode === 'closed') {
    return (
      <View style={{ flex: 1 }}>
        <EmptyState title={t.studentChannel.closed} />
      </View>
    );
  }
  const tz = phoneTz();
  const holdOf = (m: ChannelMessageView) => {
    const may = channelBubbleActions({ audience: refs.audience, message: m, now: new Date() });
    return may.edit || may.delete ? () => setHeld(m) : undefined;
  };
  const newestFirst = threadMessages(query.data.pages).reverse();
  return (
    <KeyboardFrame style={{ flex: 1 }}>
      {!writes ? <Note>{readOnlyText(first?.open)}</Note> : null}
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
          renderItem={({ item }) => (
            <ChannelBubble message={item} tz={tz} onLongPress={holdOf(item)} />
          )}
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
      <ChannelMessageMenu key={held?.id ?? 'none'} refs={refs} message={held} onClose={() => setHeld(null)} />
    </KeyboardFrame>
  );
}
