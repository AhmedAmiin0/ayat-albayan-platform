import { type ReactNode, useMemo, useState } from 'react';
import { Animated, I18nManager, PanResponder, View } from 'react-native';
import { useTheme } from '@/theme';
import { ReplyIcon } from '../../shared/chat-icons';
import { SWIPE_MAX as MAX, swipeAnswers, swipeClaims, swipeOffset } from '../hooks/swipe';

/** The translateX sign of the inline-end (gestures and transforms are physical): right in English, left in Arabic. */
const dir = I18nManager.isRTL ? -1 : 1;

/**
 * Swipe a bubble toward the inline-end to answer it, as WhatsApp (owner 2026-10-25/27): ours and
 * theirs alike, it uncovers the icon at the row's start. RN core only
 * (PanResponder + Animated, no gesture-handler): it claims a touch only once it moves sideways, and
 * hands it back whenever the list asks, so a vertical scroll of the inverted list always wins.
 * The long-press menu is the main way; this is the shortcut. Without `onReply` it is a plain row.
 */
interface SwipeReplyProps {
  onReply?: () => void;
  children: ReactNode;
}

export function SwipeReply({ onReply, children }: SwipeReplyProps) {
  const { color } = useTheme();
  const [x] = useState(() => new Animated.Value(0));
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => onReply !== undefined && swipeClaims(g, dir),
        onPanResponderMove: (_e, g) => x.setValue(swipeOffset(g.dx, dir)),
        onPanResponderRelease: (_e, g) => {
          if (swipeAnswers(g.dx, dir)) onReply?.();
          Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
        },
        onPanResponderTerminate: () =>
          Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
        onPanResponderTerminationRequest: () => true,
      }),
    // The caller keeps onReply stable (useCallback), so a refetch never swaps the responder mid-gesture.
    [x, onReply],
  );
  if (!onReply) return <>{children}</>;
  const shown = x.interpolate({
    inputRange: [-MAX, -16, 0, 16, MAX],
    outputRange: [1, 0, 0, 0, 1],
  });
  return (
    <View testID="swipe-reply" {...pan.panHandlers}>
      <Animated.View
        testID="swipe-reply-icon"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ position: 'absolute', top: 0, bottom: 0, start: 4, justifyContent: 'center', opacity: shown }}
      >
        <ReplyIcon color={color.lapis} />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX: x }] }}>{children}</Animated.View>
    </View>
  );
}
