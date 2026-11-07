import { liveDotState, type LiveDotState } from '@ab/client-core';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { useInboxLive } from './inbox-live';

/** The words a screen reader hears, and the dot's colour (existing palette, no new colour). */
const looks: Record<LiveDotState, { label: string; tone: 'ok' | 'bad' }> = {
  on: { label: t.inbox.liveOn, tone: 'ok' },
  off: { label: t.inbox.liveOff, tone: 'bad' },
};

/**
 * The live dot in the chats header (docs/44 K2, like Kapso): green while the realtime channel is
 * SUBSCRIBED, red while it is down (it rejoins with backoff meanwhile; the polls keep the chats
 * current). Read aloud as «متصل» / «غير متصل», announced when it changes.
 */
export function LiveDot() {
  const { color } = useTheme();
  const state = liveDotState(useInboxLive());
  const { label, tone } = looks[state];
  return (
    <View
      testID="live-dot"
      accessible
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      style={{ width: 8, height: 8, margin: 6, borderRadius: 4, backgroundColor: color[tone] }}
    />
  );
}
