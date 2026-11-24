import type { ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { useTheme } from '../../../theme';
import { ReplyIcon } from '../../icons/chat-glyphs';
import { SWIPE_MAX as MAX } from '../swipe';
import { useSwipeReply } from '../use-swipe-reply';

interface SwipeReplyProps {
  onReply?: () => void;
  children: ReactNode;
}

const ICON = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  start: 4,
  justifyContent: 'center',
} as const;

/**
 * Swipe a bubble toward the inline-end to answer it, as WhatsApp: ours and
 * theirs alike, it uncovers the icon at the row's start. RN core only (PanResponder + Animated, no
 * gesture-handler), so a vertical scroll of the inverted list always wins. The long-press menu is
 * the main way; this is the shortcut. Without `onReply` it is a plain row.
 */
export function SwipeReply({ onReply, children }: SwipeReplyProps) {
  const { color } = useTheme();
  const { x, pan } = useSwipeReply(onReply);
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
        style={{ ...ICON, opacity: shown }}
      >
        <ReplyIcon color={color.lapis} />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX: x }] }}>{children}</Animated.View>
    </View>
  );
}
