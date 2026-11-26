import { FlatList, View } from 'react-native';
import { FloatingDay } from '../../../chat-ui/days/FloatingDay';
import { t } from '../../../lib/i18n/i18n';
import { EmptyState } from '../../../ui/feedback/EmptyState';
import type { ChannelRef, useChannel } from '../../channel-api';
import { CellFrames, ChannelCell } from '../ChannelCell';
import { ChannelRowItem, type RowActions } from '../ChannelRowItem';
import { useFloatingDay } from '../use-floating-day';
import { useChannelRows } from '../use-channel-rows';
import { useJump } from '../use-jump';
import { OlderButton } from '../OlderButton';

interface ChannelListProps {
  refs: ChannelRef;
  query: ReturnType<typeof useChannel>;
  mode: 'write' | 'read' | 'closed';
  actions: Omit<RowActions, 'onJump'>;
  /** The message whose menu is open: lit while it is. */
  heldId: string | null;
}

/** The rows' gutter: the list itself runs edge to edge, so the unread band spans the screen. */
const GUTTER = 16;

/** Inverted to open on the newest; `now` ticks per minute, closing the 15-minute edit window. */
export function ChannelList({ refs, query, mode, actions, heldId }: ChannelListProps) {
  const { rows, clock } = useChannelRows({
    pages: query.data?.pages,
    more: query.hasNextPage,
  });
  const { listRef, lit, jump, onScrollToIndexFailed } = useJump(rows);
  const floating = useFloatingDay();
  if (rows.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <EmptyState title={t.studentChannel.empty} />
      </View>
    );
  }
  return (
    <View style={{ flex: 1, marginHorizontal: -GUTTER }}>
      <CellFrames value={floating.frame}>
        <FlatList
          ref={listRef}
          inverted
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 4, paddingHorizontal: GUTTER }}
          data={rows}
          keyExtractor={(row) => row.message.id}
          CellRendererComponent={ChannelCell}
          renderItem={({ item }) => (
            <ChannelRowItem
              row={item}
              audience={refs.audience}
              mode={mode}
              clock={clock}
              lit={lit === item.message.id || heldId === item.message.id}
              actions={{ ...actions, onJump: jump }}
            />
          )}
          ListFooterComponent={<OlderButton query={query} />}
          onViewableItemsChanged={floating.onViewable}
          onScrollToIndexFailed={onScrollToIndexFailed}
          {...floating.scroll}
        />
      </CellFrames>
      <FloatingDay label={floating.label} opacity={floating.opacity} onChip={floating.onChip} />
    </View>
  );
}
