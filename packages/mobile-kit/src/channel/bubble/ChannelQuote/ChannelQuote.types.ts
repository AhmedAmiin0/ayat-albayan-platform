import type { ChannelReplyView } from '@ab/shared';

export interface ChannelQuoteProps {
  reply: ChannelReplyView;
  /** Goes to the original when it is loaded. */
  onJump?: (id: string) => void;
}
