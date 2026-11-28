import type { ChannelMessageView } from '@ab/shared';

export interface ChannelBubbleProps {
  message: ChannelMessageView;
  tz: string;
  /** The thread's clock (useNow): today's messages show only their time. */
  now: Date;
  /** The message's menu (reply, edit, delete…); absent → a plain bubble. */
  onLongPress?: () => void;
  /** Swipe to answer it (write mode only). */
  onReply?: () => void;
  /** A long press on my ticks: who has read it. */
  onReads?: () => void;
  /** A tap on its quote: go to the original. */
  onJump?: (id: string) => void;
  /** Just jumped to, or held for its menu: a brand edge. */
  highlight?: boolean;
  /** The same sender again: no name line, no tail corner. */
  followUp?: boolean;
}
