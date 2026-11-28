import { bubbleLabel, speaksAsOne } from '../bubble-label';
import { menuA11y } from '../menu-a11y';
import type { ChannelBubbleProps } from './ChannelBubble.types';

/** One stop for a screen reader (a plain text with a menu): its label, the hint, the action. */
export const shellA11y = (p: ChannelBubbleProps, meta: string) =>
  p.onLongPress && speaksAsOne(p.message)
    ? { accessibilityLabel: bubbleLabel(p.message, meta), ...menuA11y(p.onLongPress) }
    : {};
