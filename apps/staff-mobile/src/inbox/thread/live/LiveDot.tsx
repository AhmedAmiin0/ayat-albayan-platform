import { liveDotState, type LiveDotState } from '@ab/client-core';
import { View } from 'react-native';
import { t, useTheme } from '@ab/mobile-kit';
import { useInboxLive } from './inbox-live';

/** The words a screen reader hears, and the dot's colour (existing palette, no new colour). */
const looks: Record<LiveDotState, { label: string; tone: 'ok' | 'bad' }> = {
  on: { label: t.inbox.liveOn, tone: 'ok' },
  off: { label: t.inbox.liveOff, tone: 'bad' },
};

/** docs/44 K2: red while realtime is down; it rejoins with backoff and the polls continue. */
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
