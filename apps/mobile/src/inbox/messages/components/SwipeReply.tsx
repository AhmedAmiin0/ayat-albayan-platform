import { type ReactNode, useMemo, useState } from 'react';
import { Animated, PanResponder, View } from 'react-native';
import { useTheme } from '@/theme';
import { ReplyIcon } from '../../shared/chat-icons';
import type { BubbleSide } from '../hooks/bubble-side';
import { SWIPE_MAX as MAX, swipeAnswers, swipeClaims, swipeOffset } from '../hooks/swipe';

/**
 * Swipe a bubble toward the screen's centre to answer it, as WhatsApp (owner 2026-10-25/26): it
 * uncovers the icon at the bubble's own edge (bubbleSide). RN core only
 * (PanResponder + Animated, no gesture-handler): it claims a touch only once it moves sideways, and
 * hands it back whenever the list asks, so a vertical scroll of the inverted list always wins.
 * The long-press menu is the main way; this is the shortcut. Without `onReply` it is a plain row.
 */
interface SwipeReplyProps {
  onReply?: () => void;
  side: BubbleSide;
  children: ReactNode;
}

export function SwipeReply({ onReply, side, children }: SwipeReplyProps) {
  const { color } = useTheme();
  const [x] = useState(() => new Animated.Value(0));
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          onReply !== undefined && swipeClaims(g, side.toCentre),
        onPanResponderMove: (_e, g) => x.setValue(swipeOffset(g.dx, side.toCentre)),
        onPanResponderRelease: (_e, g) => {
          if (swipeAnswers(g.dx, side.toCentre)) onReply?.();
          Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
        },
        onPanResponderTerminate: () =>
          Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
        onPanResponderTerminationRequest: () => true,
      }),
    // The caller keeps onReply stable (useCallback), so a refetch never swaps the responder mid-gesture.
    [x, onReply, side.toCentre],
  );
  if (!onReply) return <>{children}</>;
  const shown = x.interpolate({
    inputRange: [-MAX, -16, 0, 16, MAX],
    outputRange: [1, 0, 0, 0, 1],
  });
  return (
    <View testID="swipe-reply" {...pan.panHandlers}>
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          ...(side.outer === 'start' ? { start: 4 } : { end: 4 }),
          justifyContent: 'center',
          opacity: shown,
        }}
      >
        <ReplyIcon color={color.lapis} />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX: x }] }}>{children}</Animated.View>
    </View>
  );
}
