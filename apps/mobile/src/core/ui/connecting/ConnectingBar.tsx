import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, View } from 'react-native';
import { connectivity } from '@/core/lib/connectivity/connectivity';
import type { ConnectivityStore } from '@/core/lib/connectivity/connectivity-store';
import { useConnectivity } from '@/core/lib/connectivity/use-connectivity';
import { t } from '@/core/lib/i18n/i18n';
import { useA11yPref } from '@/core/ui/primitives/use-a11y-pref';
import type { BarPhase } from './bar-phase';
import { BarCard, type ShownPhase } from './BarCard';
import { useBarPhase } from './use-bar-phase';
import { useBarReveal } from './use-bar-reveal';

/** iOS has no live regions: say each message once (Android's liveRegion on the card speaks it). */
function useAnnounce(phase: BarPhase) {
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (phase === 'connecting') AccessibilityInfo.announceForAccessibility(t.mobile.connection.connecting);
    if (phase === 'connected') AccessibilityInfo.announceForAccessibility(t.mobile.connection.connected);
  }, [phase]);
}

export interface ConnectingBarProps {
  store?: ConnectivityStore;
  /** Space kept above the card (the top safe area when the bar sits above a screen with no header). */
  inset?: number;
  /** Paints the inset and the card's margins (the screen's own background), when there is an inset. */
  background?: string;
}

/**
 * The reconnecting bar: a card that grows in under a screen's header (or under the top safe area)
 * and pushes the content down, never covering it. It measures its card and animates to that height,
 * so the hint's second line and large OS text sizes never clip.
 */
export function ConnectingBar({ store = connectivity, inset = 0, background }: ConnectingBarProps) {
  const phase = useBarPhase(useConnectivity(store));
  const still = useA11yPref('reduceMotion');
  // The card keeps its last words («تم الاتصال») while it closes.
  const [shown, setShown] = useState<ShownPhase | null>(phase === 'hidden' ? null : phase);
  if (phase !== 'hidden' && shown !== phase) setShown(phase);
  const [content, setContent] = useState(0);
  const onClosed = useCallback(() => setShown(null), []);
  const { height, opacity } = useBarReveal({ open: phase !== 'hidden', content, still, onClosed });
  useAnnounce(phase);
  if (shown === null) return null;
  return (
    <View testID="connecting-bar-frame" style={{ paddingTop: inset, backgroundColor: background }}>
      <Animated.View testID="connecting-bar-reveal" style={{ height, overflow: 'hidden' }}>
        <Animated.View testID="connecting-bar-measure" style={{ opacity }} onLayout={(e) => setContent(Math.ceil(e.nativeEvent.layout.height))}>
          <BarCard phase={shown} still={still} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
