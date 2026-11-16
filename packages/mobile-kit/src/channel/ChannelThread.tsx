import type { ChannelMessageView, ChannelPage } from '@ab/shared';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { t } from '../lib/i18n/i18n';
import { useTheme } from '../theme';
import { EmptyState } from '../ui/feedback/EmptyState';
import { ErrorState } from '../ui/feedback/ErrorState';
import { Note } from '../ui/feedback/Note';
import { KeyboardFrame } from '../ui/layout/KeyboardFrame';
import { ChannelComposer } from './ChannelComposer';
import { ChannelList } from './ChannelList';
import type { ChannelRef } from './channel-api';
import { ChannelMessageMenu } from './edits/ChannelMessageMenu';
import { useChannelThread } from './use-channel-thread';

/** «للاطلاع فقط», and for a monitor of a closed channel why nobody writes yet. */
const readOnlyText = (page: ChannelPage | undefined): string =>
  page?.open === false
    ? `${t.studentChannel.readOnly} ${t.studentChannel.closedMonitor}`
    : t.studentChannel.readOnly;

/**
 * One student's channel (docs/31 §2): the messages (ChannelList), live over the socket, polled as
 * the fallback. A participant writes and marks read up to the newest message; before the
 * subscription and the teacher's assignment (owner 2026-10-29) only the closed line. A monitor
 * gets «للاطلاع فقط» and no composer.
 */
export function ChannelThread({ refs }: { refs: ChannelRef }) {
  const { color } = useTheme();
  // «تعديل» / «حذف للجميع» (owner 2026-10-30): the long-pressed message's menu.
  const [held, setHeld] = useState<ChannelMessageView | null>(null);
  const { query, mode, first } = useChannelThread(refs);
  if (!query.data) {
    return query.isError ? (
      <ErrorState message={t.studentChannel.loadFailed} onRetry={() => void query.refetch()} />
    ) : (
      <ActivityIndicator
        accessibilityLabel={t.common.loading}
        color={color.lapis}
        style={{ paddingVertical: 32 }}
      />
    );
  }
  if (mode === 'closed') {
    return (
      <View style={{ flex: 1 }}>
        <EmptyState title={t.studentChannel.closed} />
      </View>
    );
  }
  const writes = mode === 'write';
  return (
    <KeyboardFrame style={{ flex: 1 }}>
      {writes ? null : <Note>{readOnlyText(first)}</Note>}
      <ChannelList refs={refs} query={query} onHold={setHeld} />
      {writes ? (
        <View style={{ paddingBottom: 8 }}>
          <ChannelComposer refs={refs} />
        </View>
      ) : null}
      <ChannelMessageMenu
        key={held ? held.id : 'none'}
        refs={refs}
        message={held}
        onClose={() => setHeld(null)}
      />
    </KeyboardFrame>
  );
}
