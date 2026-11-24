import { ActivityIndicator } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { useTheme } from '../../theme';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { ChannelClosed } from '../closed/ChannelClosed';
import type { ChannelRef } from '../channel-api';
import { ChannelMediaContext, NO_MEDIA, type ChannelMediaPort } from '../media-port';
import { ThreadBody, type ThreadFrame } from '../ThreadBody';
import { useChannelThread } from '../use-channel-thread';

interface ChannelThreadProps {
  refs: ChannelRef;
  /** The app's picker, recorder and player; absent → text only. */
  media?: ChannelMediaPort;
  /** 'sheet' in the lesson room (no top-inset keyboard offset); a screen of its own otherwise. */
  frame?: ThreadFrame;
}

/** docs/31 §2: live over the socket, polled as fallback; monitors are read-only. */
export function ChannelThread({ refs, media, frame }: ChannelThreadProps) {
  const { color } = useTheme();
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
  if (mode === 'closed') return <ChannelClosed reason={first?.closed_reason ?? null} />;
  return (
    <ChannelMediaContext value={media ?? NO_MEDIA}>
      <ThreadBody refs={refs} query={query} mode={mode} first={first} frame={frame} />
    </ChannelMediaContext>
  );
}
