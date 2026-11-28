import type { ReactNode } from 'react';
import type {
  AccessibilityActionEvent,
  AccessibilityActionInfo,
  GestureResponderEvent,
  ViewStyle,
} from 'react-native';

export interface BubbleA11y {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityActions?: readonly AccessibilityActionInfo[];
  onAccessibilityAction?: (e: AccessibilityActionEvent) => void;
}

export interface BubbleShellProps extends BubbleA11y {
  /** Ours: at the inline-end, in the brand wash; theirs at the start, raised. */
  ours: boolean;
  /** Just jumped to: a brand edge for a moment. */
  highlight?: boolean;
  /** The sharp corner of a group's first bubble; false for a same-sender follow-up. */
  tail?: boolean;
  /** Laid over the box last (a wide template, a sticker's bare box). */
  style?: ViewStyle;
  testID?: string;
  /** The menu's long press; absent, the bubble is a plain View. */
  onLongPress?: (e: GestureResponderEvent) => void;
  children: ReactNode;
}
